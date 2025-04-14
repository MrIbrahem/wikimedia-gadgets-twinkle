// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinklexfd.js: XFD module
	 ****************************************
	 * Mode of invocation:     Tab ("XFD")
	 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
	 */

	Twinkle.xfd = function twinklexfd() {
		// Disable on:
		// * special pages
		// * non-existent pages
		// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2, or R4 if it's a redirect)
		if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && document.getElementById('mw-sharedupload'))) {
			return;
		}

		let tooltip = 'بدء مناقشة لحذف';
		if (mw.config.get('wgIsRedirect')) {
			tooltip += ' أو إعادة توجيه هذا التحويل';
		} else {
			switch (mw.config.get('wgNamespaceNumber')) {
				case 0:
					tooltip += ' أو نقل هذه المقالة';
					break;
				case 10:
					tooltip += ' أو دمج هذا القالب';
					break;
				case 828:
					tooltip += ' أو دمج هذه الوحدة النمطية';
					break;
				case 6:
					tooltip += ' هذا الملف';
					break;
				case 14:
					tooltip += ' أو دمج أو إعادة تسمية هذه التصنيف';
					break;
				default:
					tooltip += ' هذه الصفحة';
					break;
			}
		}
		Twinkle.addPortletLink(Twinkle.xfd.callback, 'نقاش حذف', 'tw-xfd', tooltip);
	};

	const utils = {
		/** Get ordinal number figure */
		num2order: function (num) {
			switch (num) {
				case 1: return '';
				case 2: return 'الثاني';
				case 3: return 'الثالث';
				default: return num + 'th';
			}
		},

		/**
		 * Remove namespace name from title if present
		 * Exception-safe wrapper around mw.Title
		 *
		 * @param {string} title
		 */
		stripNs: function (title) {
			const title_obj = mw.Title.newFromUserInput(title);
			if (!title_obj) {
				return title; // user entered invalid input; do nothing
			}
			return title_obj.getNameText();
		},

		/**
		 * Add namespace name to page title if not already given
		 * CAUTION: namespace name won't be added if a namespace (*not* necessarily
		 * the same as the one given) already is there in the title
		 *
		 * @param {string} title
		 * @param {number} namespaceNumber
		 */
		addNs: function (title, namespaceNumber) {
			const title_obj = mw.Title.newFromUserInput(title, namespaceNumber);
			if (!title_obj) {
				return title; // user entered invalid input; do nothing
			}
			return title_obj.toText();
		},

		/**
		 * Provide Wikipedian TLA style: AfD, RfD, CfDS, RM, SfD, etc.
		 *
		 * @param {string} venue
		 * @return {string}
		 */
		toTLACase: function (venue) {
			return venue
				.toString()
				// Everybody up, inclduing rm and the terminal s in cfds
				.toUpperCase()
				// Lowercase the central f in a given TLA and normalize sfd-t and sfr-t
				.replace(/(.)F(.)(?:-.)?/, '$1f$2');
		}
	};

	Twinkle.xfd.currentRationale = null;

	// error callback on Morebits.Status.object
	Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
		if (Twinkle.xfd.currentRationale) {
			Morebits.Status.printUserText(Twinkle.xfd.currentRationale, 'يتم توفير الأساس المنطقي للحذف الخاص بك أدناه، والذي يمكنك نسخه ولصقه في مربع حوار XFD جديد إذا كنت ترغب في المحاولة مرة أخرى:');
			// only need to print the rationale once
			Twinkle.xfd.currentRationale = null;
		}
	};

	Twinkle.xfd.callback = function twinklexfdCallback() {
		const Window = new Morebits.SimpleWindow(700, 400);
		Window.setTitle('بدء مناقشة حول الحذف (XfD)');
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('حول مناقشات الحذف', 'WP:XFD');
		Window.addFooterLink('تفضيلات XfD', 'ويكيبيديا:Twinkle/Preferences#xfd');
		Window.addFooterLink('مساعدة لمح البصر!', 'ويكيبيديا:لمح البصر/توثيق#xfd');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.xfd.callback.evaluate);
		const categories = form.append({
			type: 'select',
			name: 'venue',
			label: 'مكان مناقشة الحذف:',
			tooltip: 'عند التنشيط، يتم تحديد خيار افتراضي، بناءً على نطاق الاسم التي تتواجد فيها. يجب أن يكون هذا الافتراضي هو الأنسب.',
			event: Twinkle.xfd.callback.change_category
		});
		const namespace = mw.config.get('wgNamespaceNumber');

		categories.append({
			type: 'option',
			label: 'AfD (مقالات للحذف)',
			selected: namespace === 0, // Main namespace
			value: 'afd'
		});
		categories.append({
			type: 'option',
			label: 'TfD (قوالب للمناقشة)',
			selected: [10, 828].includes(namespace), // Template and module namespaces
			value: 'tfd'
		});
		categories.append({
			type: 'option',
			label: 'FfD (ملفات للمناقشة)',
			selected: namespace === 6, // File namespace
			value: 'ffd'
		});
		categories.append({
			type: 'option',
			label: 'CfD (تصنيفات للمناقشة)',
			selected: namespace === 14 || (namespace === 10 && /-stub$/.test(Morebits.pageNameNorm)), // Category namespace and stub templates
			value: 'cfd'
		});
		categories.append({
			type: 'option',
			label: 'CfD/S (تصنيفات لإعادة التسمية السريعة)',
			value: 'cfds'
		});
		categories.append({
			type: 'option',
			label: 'MfD (متفرقات للحذف)',
			selected: ![0, 6, 10, 14, 828].includes(namespace) || Morebits.pageNameNorm.indexOf('Template:User ', 0) === 0,
			// Other namespaces, and userboxes in template namespace
			value: 'mfd'
		});
		categories.append({
			type: 'option',
			label: 'RfD (عمليات إعادة التوجيه للمناقشة)',
			selected: mw.config.get('wgIsRedirect'),
			value: 'rfd'
		});
		categories.append({
			type: 'option',
			label: 'RM (التحركات المطلوبة)',
			selected: false,
			value: 'rm'
		});

		form.append({
			type: 'div',
			id: 'wrong-venue-warn',
			style: 'color: red; font-style: italic'
		});

		form.append({
			type: 'checkbox',
			list: [
				{
					label: 'إعلام مُنشئ الصفحة إذا أمكن',
					value: 'notify',
					name: 'notifycreator',
					tooltip: "سيتم وضع قالب إشعار في صفحة نقاش المنشئ إذا كان هذا صحيحًا.",
					checked: true
				}
			]
		});
		form.append({
			type: 'field',
			label: 'منطقة العمل',
			name: 'work_area'
		});

		const previewlink = document.createElement('a');
		$(previewlink).on('click', () => {
			Twinkle.xfd.callbacks.preview(result); // |result| is defined below
		});
		previewlink.style.cursor = 'pointer';
		previewlink.textContent = 'معاينة';
		form.append({ type: 'div', id: 'xfdpreview', label: [previewlink] });
		form.append({ type: 'div', id: 'twinklexfd-previewbox', style: 'display: none' });

		form.append({ type: 'submit' });

		var result = form.render();
		Window.setContent(result);
		Window.display();
		result.previewer = new Morebits.wiki.Preview($(result).find('div#twinklexfd-previewbox').last()[0]);

		// We must init the controls
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.venue.dispatchEvent(evt);
	};

	Twinkle.xfd.callback.wrongVenueWarning = function twinklexfdWrongVenueWarning(venue) {
		let text = '';
		const namespace = mw.config.get('wgNamespaceNumber');

		switch (venue) {
			case 'afd':
				if (namespace !== 0) {
					text = 'AfD مناسب بشكل عام للمقالات فقط.';
				} else if (mw.config.get('wgIsRedirect')) {
					text = 'الرجاء استخدام RfD لعمليات إعادة التوجيه.';
				}
				break;
			case 'tfd':
				if (namespace === 10 && /-stub$/.test(Morebits.pageNameNorm)) {
					text = 'استخدم CfD لقوالب بذرة.';
				} else if (Morebits.pageNameNorm.indexOf('Template:User ', 0) === 0) {
					text = 'الرجاء استخدام MfD لصناديق المستخدم';
				}
				break;
			case 'cfd':
				if (![10, 14].includes(namespace)) {
					text = 'CfD مخصص فقط للتصنيفات وقوالب البذرة.';
				}
				break;
			case 'cfds':
				if (namespace !== 14) {
					text = 'CfDS مخصص فقط للتصنيفات.';
				}
				break;
			case 'ffd':
				if (namespace !== 6) {
					text = 'تم تحديد FFD ولكن هذه الصفحة لا تبدو كملف!';
				}
				break;
			case 'rm':
				if (namespace === 14) { // category
					text = 'الرجاء استخدام CfD أو CfDS لإعادة تسمية التصنيف.';
				} else if ([118, 119, 2, 3].includes(namespace)) { // draft, draft talk, user, user talk
					text = 'لا يُسمح بعمليات RM في المسودة ونطاق المستخدم، ما لم تكن طلبات فنية غير مثيرة للجدل.';
				}
				break;

			default: // mfd or rfd
				break;
		}

		$('#wrong-venue-warn').text(text);

	};

	Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
		const value = e.target.value;
		const form = e.target.form;
		const old_area = Morebits.QuickForm.getElements(e.target.form, 'work_area')[0];
		let work_area = null;

		const oldreasontextbox = form.getElementsByTagName('textarea')[0];
		const oldreason = oldreasontextbox ? oldreasontextbox.value : '';

		const appendReasonBox = function twinklexfdAppendReasonBox() {
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'السبب:',
				value: oldreason,
				tooltip: 'يمكنك استخدام ترميز الويكي في السبب الخاص بك. سيوقع توينكل تلقائيًا على مشاركتك.'
			});
		};

		Twinkle.xfd.callback.wrongVenueWarning(value);

		form.previewer.closePreview();

		switch (value) {
			case 'afd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'مقالات للحذف',
					name: 'work_area'
				});

				work_area.append({
					type: 'div',
					label: '', // Added later by Twinkle.makeFindSourcesDiv()
					id: 'twinkle-xfd-findsources',
					style: 'margin-bottom: 5px; margin-top: -5px;'
				});

				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'لف علامة الحذف باستخدام <noinclude>',
							value: 'noinclude',
							name: 'noinclude',
							tooltip: 'سوف يلف علامة الحذف في علامات <noinclude> ، بحيث لا يتم تضمينها. هذا الخيار غير مطلوب بشكل طبيعي.'
						}
					]
				});
				work_area.append({
					type: 'select',
					name: 'xfdcat',
					label: 'اختر التصنيف التي ينتمي إليها هذا الترشيح:',
					list: [
						{ type: 'option', label: 'غير معروف', value: '?', selected: true },
						{ type: 'option', label: 'وسائل الإعلام والموسيقى', value: 'M' },
						{ type: 'option', label: 'منظمة أو شركة أو منتج', value: 'O' },
						{ type: 'option', label: 'سيرة ذاتية', value: 'B' },
						{ type: 'option', label: 'موضوعات المجتمع', value: 'S' },
						{ type: 'option', label: 'الويب أو الإنترنت', value: 'W' },
						{ type: 'option', label: 'ألعاب أو رياضات', value: 'G' },
						{ type: 'option', label: 'العلوم والتكنولوجيا', value: 'T' },
						{ type: 'option', label: 'الخيال والفنون', value: 'F' },
						{ type: 'option', label: 'أماكن ومواصلات', value: 'P' },
						{ type: 'option', label: 'موضوع غير مميز أو غير قابل للتصنيف', value: 'I' },
						{ type: 'option', label: 'نقاش لم يتم فرزه بعد', value: 'U' }
					]
				});

				work_area.append({
					type: 'select',
					multiple: true,
					name: 'delsortCats',
					label: 'اختر تصنيفات فرز الحذف:',
					tooltip: 'حدد بعض التصنيفات ذات الصلة تحديدًا بموضوع المقالة. كن دقيقًا قدر الإمكان؛ يجب استخدام تصنيفات مثل الأشخاص والولايات المتحدة الأمريكية فقط في حالة عدم وجود تصنيفات أخرى.'
				});

				// grab deletion sort categories from en-wiki
				Morebits.wiki.getCachedJson('User:Mr. Ibrahem/Computer-readable.json').then((delsortCategories) => {
					const $select = $('[name="delsortCats"]');
					$.each(delsortCategories, (groupname, list) => {
						const $optgroup = $('<optgroup>').attr('label', groupname);
						const $delsortCat = $select.append($optgroup);
						list.forEach((item) => {
							const $option = $('<option>').val(item).text(item);
							$delsortCat.append($option);
						});
					});
				});

				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);

				Twinkle.makeFindSourcesDiv('#twinkle-xfd-findsources');

				$(work_area).find('[name=delsortCats]')
					.attr('data-placeholder', 'حدد صفحات delsort')
					.select2({
						theme: 'default select2-morebits',
						width: '100%',
						matcher: Morebits.select2.matcher,
						templateResult: Morebits.select2.highlightSearchMatches,
						language: {
							searching: Morebits.select2.queryInterceptor
						},
						// Link text to the page itself
						templateSelection: function (choice) {
							return $('<a>').text(choice.text).attr({
								href: mw.util.getUrl('Wikipedia:WikiProject_Deletion_sorting/' + choice.text),
								target: '_blank'
							});
						}
					});

				mw.util.addCSS(
					// Remove black border
					'.select2-container--default.select2-container--focus .select2-selection--multiple { border: 1px solid #aaa; }' +

					// Reduce padding
					'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
					'.select2-results .select2-results__group { padding-top: 1px; padding-bottom: 1px; } ' +

					// Adjust font size
					'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
					'.select2-container .selection .select2-selection__rendered { font-size: 13px; }' +

					// Make the tiny cross larger
					'.select2-selection__choice__remove { font-size: 130%; }'
				);
				break;

			case 'tfd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'قوالب للمناقشة',
					name: 'work_area'
				});

				var templateOrModule = mw.config.get('wgPageContentModel') === 'Scribunto' ? 'module' : 'template';
				work_area.append({
					type: 'select',
					label: 'اختر نوع الإجراء المطلوب:',
					name: 'xfdcat',
					event: function (e) {
						const target = e.target;
						let tfdtarget = target.form.tfdtarget;
						// add/remove extra input box
						if (target.value === 'tfm' && !tfdtarget) {
							tfdtarget = new Morebits.QuickForm.Element({
								name: 'tfdtarget',
								type: 'input',
								label: 'الآخر ' + templateOrModule + ' ليتم دمجه:',
								tooltip: 'مطلوب. يجب ألا يتضمن البادئة ' + Morebits.string.toUpperCaseFirstChar(templateOrModule) + ': لنطاق الاسم.',
								required: true
							});
							target.parentNode.appendChild(tfdtarget.render());
						} else {
							$(Morebits.QuickForm.getElementContainer(tfdtarget)).remove();
							tfdtarget = null;
						}
					},
					list: [
						{ type: 'option', label: 'حذف', value: 'tfd', selected: true },
						{ type: 'option', label: 'دمج', value: 'tfm' }
					]
				});
				work_area.append({
					type: 'select',
					name: 'templatetype',
					label: 'نمط عرض علامة الحذف:',
					tooltip: 'أي معلمة <code>type=</code> لتمريرها إلى قالب علامة TfD.',
					list: templateOrModule === 'module' ? [
						{ type: 'option', value: 'module', label: 'وحدة نمطية', selected: true }
					] : [
						{ type: 'option', value: 'standard', label: 'قياسي', selected: true },
						{ type: 'option', value: 'sidebar', label: 'الشريط الجانبي/صندوق المعلومات', selected: $('.infobox').length },
						{ type: 'option', value: 'inline', label: 'قالب مضمن', selected: $('.mw-parser-output > p .Inline-Template').length },
						{ type: 'option', value: 'tiny', label: 'مضمن صغير' },
						{ type: 'option', value: 'disabled', label: 'معطل' }
					]
				});

				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'لف علامة الحذف باستخدام <noinclude> (للقوالب المستبدلة فقط)',
							value: 'noinclude',
							name: 'noinclude',
							tooltip: 'سوف يلف علامة الحذف في علامات <noinclude> ، بحيث لا يتم استبدالها مع القالب.',
							disabled: templateOrModule === 'module',
							checked: !!$('.box-Subst_only').length // Default to checked if page carries {{subst only}}
						}
					]
				});

				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'إخطار صفحات نقاش النصوص البرمجية للمستخدم المتأثرة',
							value: 'devpages',
							name: 'devpages',
							tooltip: 'سيتم إرسال إشعار إلى صفحات نقاش توينكل و AWB و Ultraviolet إذا تم وضع علامة على هذه النصوص البرمجية للمستخدم على أنها تستخدم هذا القالب.',
							checked: true
						}
					]
				});

				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'mfd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'متفرقات للحذف',
					name: 'work_area'
				});
				if (mw.config.get('wgNamespaceNumber') !== 710) { // TimedText cannot be tagged, so asking whether to noinclude the tag is pointless
					work_area.append({
						type: 'checkbox',
						list: [
							{
								label: 'لف علامة الحذف باستخدام <noinclude>',
								value: 'noinclude',
								name: 'noinclude',
								tooltip: 'سوف يلف علامة الحذف في علامات <noinclude> ، بحيث لا يتم تضمينها. حدد هذا الخيار لصناديق المستخدم.'
							}
						]
					});
				}
				if ((mw.config.get('wgNamespaceNumber') === 2 /* User: */ || mw.config.get('wgNamespaceNumber') === 3 /* User talk: */) && mw.config.exists('wgRelevantUserName')) {
					work_area.append({
						type: 'checkbox',
						list: [
							{
								label: 'إخطار مالك نطاق المستخدم (إذا لم يكن هو مُنشئ الصفحة)',
								value: 'notifyuserspace',
								name: 'notifyuserspace',
								tooltip: 'إذا كان المستخدم الذي تقع في نطاق المستخدم الخاصة به هذه الصفحة ليس هو مُنشئ الصفحة (على سبيل المثال، الصفحة عبارة عن مقالة تم إنقاذها ومخزنة كمسودة في نطاق المستخدم) ، فقم أيضًا بإخطار مالك نطاق المستخدم.',
								checked: true
							}
						]
					});
				}
				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
			case 'ffd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أماكن المناقشة للملفات',
					name: 'work_area'
				});
				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'cfd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'تصنيفات للمناقشة',
					name: 'work_area'
				});
				var isCategory = mw.config.get('wgNamespaceNumber') === 14;
				work_area.append({
					type: 'select',
					label: 'اختر نوع الإجراء المطلوب:',
					name: 'xfdcat',
					event: function (e) {
						const value = e.target.value,
							cfdtarget = e.target.form.cfdtarget;
						let cfdtarget2 = e.target.form.cfdtarget2;

						// update enabled status
						cfdtarget.disabled = value === 'cfd' || value === 'sfd-t';

						if (isCategory) {
							// update label
							if (value === 'cfs') {
								Morebits.QuickForm.setElementLabel(cfdtarget, 'التصنيفات المستهدفة: ');
							} else if (value === 'cfc') {
								Morebits.QuickForm.setElementLabel(cfdtarget, 'المقالة المستهدفة: ');
							} else {
								Morebits.QuickForm.setElementLabel(cfdtarget, 'التصنيف المستهدفة: ');
							}
							// add/remove extra input box
							if (value === 'cfs') {
								if (cfdtarget2) {
									cfdtarget2.disabled = false;
									$(cfdtarget2).show();
								} else {
									cfdtarget2 = document.createElement('input');
									cfdtarget2.setAttribute('name', 'cfdtarget2');
									cfdtarget2.setAttribute('type', 'text');
									cfdtarget2.setAttribute('required', 'true');
									cfdtarget.parentNode.appendChild(cfdtarget2);
								}
							} else {
								$(cfdtarget2).prop('disabled', true);
								$(cfdtarget2).hide();
							}
						} else { // Update stub template label
							Morebits.QuickForm.setElementLabel(cfdtarget, 'قالب البذرة المستهدف: ');
						}
					},
					list: isCategory ? [
						{ type: 'option', label: 'حذف', value: 'cfd', selected: true },
						{ type: 'option', label: 'دمج', value: 'cfm' },
						{ type: 'option', label: 'إعادة تسمية', value: 'cfr' },
						{ type: 'option', label: 'تقسيم', value: 'cfs' },
						{ type: 'option', label: 'تحويل إلى مقالة', value: 'cfc' }
					] : [
						{ type: 'option', label: 'حذف البذرة', value: 'sfd-t', selected: true },
						{ type: 'option', label: 'إعادة تسمية البذرة', value: 'sfr-t' }
					]
				});

				work_area.append({
					type: 'input',
					name: 'cfdtarget',
					label: 'التصنيف المستهدفة:', // default, changed above
					disabled: true,
					required: true, // only when enabled
					value: ''
				});
				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'cfds':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'تصنيفات لإعادة التسمية السريعة',
					name: 'work_area'
				});
				work_area.append({
					type: 'select',
					label: 'معيار C2 الفرعي:',
					name: 'xfdcat',
					tooltip: 'راجع WP:CFDS للحصول على تفسيرات كاملة.',
					list: [
						{ type: 'option', label: 'C2A: إصلاحات مطبعية وإملائية', value: 'C2A', selected: true },
						{ type: 'option', label: 'C2B: اتفاقيات التسمية وإزالة الغموض', value: 'C2B' },
						{ type: 'option', label: 'C2C: الاتساق مع أسماء التصنيفات المماثلة', value: 'C2C' },
						{ type: 'option', label: 'C2D: إعادة تسمية لمطابقة اسم المقالة', value: 'C2D' },
						{ type: 'option', label: 'C2E: طلب المؤلف', value: 'C2E' },
						{ type: 'option', label: 'C2F: مقالة واحدة مسماة', value: 'C2F' }
					]
				});

				work_area.append({
					type: 'input',
					name: 'cfdstarget',
					label: 'اسم جديد:',
					size: 70,
					value: '',
					required: true
				});
				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'rfd':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'عمليات إعادة التوجيه للمناقشة',
					name: 'work_area'
				});

				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'إخطار الصفحة المستهدفة إذا أمكن',
							value: 'relatedpage',
							name: 'relatedpage',
							tooltip: "سيتم وضع قالب إشعار في صفحة نقاش هدف إعادة التوجيه هذه إذا كان هذا صحيحًا.",
							checked: true
						}
					]
				});
				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'rm': {
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'التحركات المطلوبة',
					name: 'work_area'
				});
				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'طلب فني غير مثير للجدل',
							value: 'rmtr',
							name: 'rmtr',
							tooltip: 'استخدم هذا الخيار عندما تكون غير قادر على إجراء هذه الخطوة الفنية غير المثيرة للجدل بنفسك بسبب سبب فني (على سبيل المثال، توجد صفحة بالفعل في العنوان الجديد، أو الصفحة محمية)',
							checked: false,
							event: function () {
								$('input[name="newname"]', form).prop('required', this.checked);
								$('input[type="button"][value="more"]', form)[0].sublist.inputs[1].required = this.checked;
							},
							subgroup: {
								type: 'checkbox',
								list: [
									{
										label: 'الانسحاب من المناقشة إذا كان الطلب متنازع عليه',
										value: 'rmtr-discuss',
										name: 'rmtr-discuss',
										tooltip: 'استخدم هذا الخيار إذا كنت تفضل سحب الطلب إذا تم الاعتراض عليه، بدلاً من مناقشته. يؤدي هذا إلى قمع ارتباط "المناقشة" ، والذي يمكن استخدامه لتحويل طلبك إلى مناقشة في صفحة النقاش.',
										checked: false
									}
								]
							}
						}
					]
				});
				work_area.append({
					type: 'dyninput',
					inputs: [
						{
							label: 'من:',
							name: 'currentname',
							required: true
						},
						{
							label: 'إلى:',
							name: 'newname',
							tooltip: 'مطلوب للطلبات الفنية. بخلاف ذلك ، إذا لم تكن متأكدًا من العنوان المناسب، فيمكنك تركه فارغًا.'
						}
					],
					min: 1
				});

				appendReasonBox();
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);

				const currentNonTalkPage = mw.Title.newFromText(Morebits.pageNameNorm).getSubjectPage().toText();
				form.currentname.value = currentNonTalkPage;
				break;
			}

			default:
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'لا شيء لأي شيء',
					name: 'work_area'
				});
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
		}

		// Return to checked state when switching, but no creator notification for CFDS or RM
		form.notifycreator.disabled = value === 'cfds' || value === 'rm';
		form.notifycreator.checked = !form.notifycreator.disabled;
	};

	Twinkle.xfd.callbacks = {
		// Requires having the tag text (params.tagText) set ahead of time
		autoEditRequest: function (pageobj, params) {
			const talkName = new mw.Title(pageobj.getPageName()).getTalkPage().toText();
			if (talkName === pageobj.getPageName()) {
				pageobj.getStatusElement().error('الصفحة محمية ولا يوجد مكان لإضافة طلب تحرير، أُلغي الطلب');
			} else {
				pageobj.getStatusElement().warn('الصفحة محمية، ويتم طلب التحرير');

				const editRequest = '{{subst:Xfd edit protected|page=' + pageobj.getPageName() +
					'|discussion=' + params.discussionpage + (params.venue === 'rfd' ? '|rfd=yes' : '') +
					'|tag=<nowiki>' + params.tagText + '\u003C/nowiki>}}'; // U+003C: <

				const talk_page = new Morebits.wiki.Page(talkName, 'نشر طلب تحرير تلقائيًا في صفحة النقاش');
				talk_page.setNewSectionTitle('طلب تحرير لإكمال ترشيح ' + utils.toTLACase(params.venue));
				talk_page.setNewSectionText(editRequest);
				talk_page.setCreateOption('recreate');
				talk_page.setWatchlist(Twinkle.getPref('xfdWatchPage'));
				talk_page.setFollowRedirect(true); // should never be needed, but if the article is moved, we would want to follow the redirect
				talk_page.setChangeTags(Twinkle.changeTags);
				talk_page.setCallbackParameters(params);
				talk_page.newSection(null, () => {
					talk_page.getStatusElement().warn('غير قادر على إضافة طلب تحرير، قد تكون صفحة النقاش محمية');
				});
			}
		},
		getDiscussionWikitext: function (venue, params) {
			if (venue === 'cfds') { // CfD/S takes a completely different style
				return '* [[:' + Morebits.pageNameNorm + ']] إلى [[:' + params.cfdstarget + ']]\u00A0\u2013 ' +
					params.xfdcat + (params.reason ? ': ' + Morebits.string.formatReasonText(params.reason) : '.') + ' ~~~~';
				// U+00A0 NO-BREAK SPACE; U+2013 EN RULE
			}
			if (venue === 'rm') {
				if (params.rmtr) {
					const rmtrDiscuss = params['rmtr-discuss'] ? '|discuss=no' : '';
					return params.currentname
						.map((currentname, i) => `{{subst:RMassist|1=${currentname}|2=${params.newname[i]}${rmtrDiscuss}|reason=${params.reason}}}`)
						.join('\n');
				}
				return `{{subst:Requested move${params.currentname
					.map((currentname, i) => `|current${i + 1}=${currentname}|new${i + 1}=${params.newname[i]}`)
					.join('')
					}|reason=${params.reason}}}`;
			}

			let text = '{{subst:' + venue + '2';
			const reasonKey = venue === 'ffd' ? 'Reason' : 'text';
			// Add a reason unconditionally, so that at least a signature is added
			text += '|' + reasonKey + '=' + Morebits.string.formatReasonText(params.reason, true);

			if (venue === 'afd' || venue === 'mfd') {
				text += '|pg=' + Morebits.pageNameNorm;
				if (venue === 'afd') {
					text += '|cat=' + params.xfdcat;
				}
			} else if (venue === 'rfd') {
				text += '|redirect=' + Morebits.pageNameNorm;
			} else {
				text += '|1=' + mw.config.get('wgTitle');
				if (mw.config.get('wgPageContentModel') === 'Scribunto') {
					text += '|module=Module:';
				}
			}

			if (params.rfdtarget) {
				text += '|target=' + params.rfdtarget + (params.section ? '#' + params.section : '');
			} else if (params.tfdtarget) {
				text += '|2=' + params.tfdtarget;
			} else if (params.cfdtarget) {
				text += '|2=' + params.cfdtarget;
				if (params.cfdtarget2) {
					text += '|3=' + params.cfdtarget2;
				}
			} else if (params.uploader) {
				text += '|Uploader=' + params.uploader;
			}

			text += '}}';

			if (venue === 'rfd' || venue === 'tfd' || venue === 'cfd') {
				text += '\n';
			}

			// Don't delsort if delsortCats is undefined (TFD, FFD, etc.)
			// Don't delsort if delsortCats is an empty array (AFD where user chose no categories)
			if (Array.isArray(params.delsortCats) && params.delsortCats.length) {
				text += '\n{{subst:Deletion sorting/multi|' + params.delsortCats.join('|') + '|sig=~~~~}}';
			}

			return text;
		},
		showPreview: function (form, venue, params) {
			const templatetext = Twinkle.xfd.callbacks.getDiscussionWikitext(venue, params);
			if (venue === 'rm') { // RM templates are sensitive to page title
				form.previewer.beginRender(templatetext, params.rmtr ? 'Wikipedia:Requested moves/Technical requests' : new mw.Title(Morebits.pageNameNorm).getTalkPage().toText());
			} else {
				form.previewer.beginRender(templatetext, 'WP:TW'); // Force wikitext
			}
		},
		preview: function (form) {
			// venue, reason, xfdcat, tfdtarget, cfdtarget, cfdtarget2, cfdstarget, delsortCats, newname
			const params = Morebits.QuickForm.getInputData(form);

			const venue = params.venue;

			// Remove CfD or TfD namespace prefixes if given
			if (params.tfdtarget) {
				params.tfdtarget = utils.stripNs(params.tfdtarget);
			} else if (params.cfdtarget) {
				params.cfdtarget = utils.stripNs(params.cfdtarget);
				if (params.cfdtarget2) {
					params.cfdtarget2 = utils.stripNs(params.cfdtarget2);
				}
			} else if (params.cfdstarget) { // Add namespace if not given (CFDS)
				params.cfdstarget = utils.addNs(params.cfdstarget, 14);
			}

			if (venue === 'ffd') {
				// Fetch the uploader
				const page = new Morebits.wiki.Page(mw.config.get('wgPageName'));
				page.lookupCreation(() => {
					params.uploader = page.getCreator();
					Twinkle.xfd.callbacks.showPreview(form, venue, params);
				});
			} else if (venue === 'rfd') { // Find the target
				Twinkle.xfd.callbacks.rfd.findTarget(params, (params) => {
					Twinkle.xfd.callbacks.showPreview(form, venue, params);
				});
			} else if (venue === 'cfd') { // Swap in CfD subactions
				Twinkle.xfd.callbacks.showPreview(form, params.xfdcat, params);
			} else {
				Twinkle.xfd.callbacks.showPreview(form, venue, params);
			}
		},
		/**
		 * Unified handler for sending {{Xfd notice}} notifications
		 * Also handles userspace logging
		 *
		 * @param {Object} params
		 * @param {string} notifyTarget The user or page being notified
		 * @param {boolean} [noLog=false] Whether to skip logging to userspace
		 * XfD log, especially useful in cases in where multiple notifications
		 * may be sent out (MfD, TfM, RfD)
		 * @param {string} [actionName] Alternative description of the action
		 * being undertaken. Required if not notifying a user talk page.
		 */
		notifyUser: function (params, notifyTarget, noLog, actionName) {
			// Ensure items with User talk or no namespace prefix both end
			// up at user talkspace as expected, but retain the
			// prefix-less username for addToLog
			notifyTarget = mw.Title.newFromText(notifyTarget, 3);
			const targetNS = notifyTarget.getNamespaceId();
			const usernameOrTarget = notifyTarget.getRelativeText(3);
			notifyTarget = notifyTarget.toText();
			if (targetNS === 3) {
				// Disallow warning yourself
				if (usernameOrTarget === mw.config.get('wgUserName')) {
					Morebits.Status.warn('أنت (' + usernameOrTarget + ') من أنشأ هذه الصفحة؛ تخطي إشعار المستخدم');

					// if we thought we would notify someone but didn't,
					// then jump to logging.
					Twinkle.xfd.callbacks.addToLog(params, null);
					return;
				}
				// Default is notifying the initial contributor, but MfD also
				// notifies userspace page owner
				actionName = actionName || 'إعلام المساهم الأولي (' + usernameOrTarget + ')';
			}

			let notifytext = '\n{{subst:' + params.venue + ' notice';
			// Venue-specific parameters
			switch (params.venue) {
				case 'afd':
				case 'mfd':
					notifytext += params.numbering !== '' ? '|order= ' + params.numbering : '';
					break;
				case 'tfd':
					if (params.xfdcat === 'tfm') {
						notifytext = '\n{{subst:Tfm notice|2=' + params.tfdtarget;
					}
					break;
				case 'cfd':
					notifytext += '|action=' + params.action + (mw.config.get('wgNamespaceNumber') === 10 ? '|stub=yes' : '');
					break;
				default: // ffd, rfd
					break;
			}
			notifytext += '|1=' + Morebits.pageNameNorm + '}} ~~~~';

			// Link to the venue; object used here rather than repetitive items in switch
			const venueNames = {
				afd: 'مقالات للحذف',
				tfd: 'قوالب للمناقشة',
				mfd: 'متفرقات للحذف',
				cfd: 'تصنيفات للمناقشة',
				ffd: 'ملفات للمناقشة',
				rfd: 'عمليات إعادة التوجيه للمناقشة'
			};
			const editSummary = 'إشعار: [[:' + params.discussionpage + '|إدراج]] [[:' +
				Morebits.pageNameNorm + ']] في [[WP:' + venueNames[params.venue] + ']].';

			const usertalkpage = new Morebits.wiki.Page(notifyTarget, actionName);
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary(editSummary);
			usertalkpage.setChangeTags(Twinkle.changeTags);
			usertalkpage.setCreateOption('recreate');
			// Different pref for RfD target notifications
			if (params.venue === 'rfd' && targetNS !== 3) {
				usertalkpage.setWatchlist(Twinkle.getPref('xfdWatchRelated'));
			} else {
				usertalkpage.setWatchlist(Twinkle.getPref('xfdWatchUser'));
			}
			usertalkpage.setFollowRedirect(true, false);

			if (noLog) {
				usertalkpage.append();
			} else {
				usertalkpage.append(() => {
					// Don't treat RfD target or MfD userspace owner as initialContrib in log
					if (!params.notifycreator) {
						notifyTarget = null;
					}
					// add this nomination to the user's userspace log
					Twinkle.xfd.callbacks.addToLog(params, usernameOrTarget);
				}, () => {
					// if user could not be notified, log nomination without mentioning that notification was sent
					Twinkle.xfd.callbacks.addToLog(params, null);
				});
			}
		},
		addToLog: function (params, initialContrib) {
			if (!Twinkle.getPref('logXfdNominations') || Twinkle.getPref('noLogOnXfdNomination').includes(params.venue)) {
				return;
			}

			const usl = new Morebits.UserspaceLogger(Twinkle.getPref('xfdLogPageName'));// , 'Adding entry to userspace log');

			usl.initialText =
				"هذا سجل لجميع ترشيحات [[WP:XFD|مناقشة الحذف]] التي قدمها هذا المستخدم باستخدام وحدة XfD الخاصة بـ [[WP:TW|Twinkle]].\n\n" +
				'إذا لم تعد ترغب في الاحتفاظ بهذا السجل، فيمكنك إيقاف تشغيله باستخدام [[ويكيبيديا:Twinkle/Preferences|لوحة التفضيلات]] ، وترشيح هذه الصفحة للحذف السريع بموجب [[WP:CSD#U1|CSD U1]].' +
				(Morebits.userIsSysop ? '\n\nلا يتتبع هذا السجل عمليات الحذف المتعلقة بـ XfD التي تتم باستخدام لمح البصر.' : '');

			let editsummary;
			if (params.discussionpage) {
				editsummary = 'تسجيل [[' + params.discussionpage + '|ترشيح]] ' + utils.toTLACase(params.venue) + ' لـ [[:' + Morebits.pageNameNorm + ']].';
			} else {
				editsummary = 'تسجيل ترشيح ' + utils.toTLACase(params.venue) + ' لـ [[:' + Morebits.pageNameNorm + ']].';
			}

			// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
			const fileLogLink = mw.config.get('wgNamespaceNumber') === 6 ? ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} سجل])' : '';
			// CFD/S and RM don't have canonical links
			const nominatedLink = params.discussionpage ? '[[' + params.discussionpage + '|تم الترشيح]]' : 'تم الترشيح';

			let appendText = '# [[:' + Morebits.pageNameNorm + ']]:' + fileLogLink + ' ' + nominatedLink + ' في [[WP:' + params.venue.toUpperCase() + '|' + utils.toTLACase(params.venue) + ']]';

			switch (params.venue) {
				case 'tfd':
					if (params.xfdcat === 'tfm') {
						appendText += ' (دمج)';
						if (params.tfdtarget) {
							const contentModel = mw.config.get('wgPageContentModel') === 'Scribunto' ? 'Module:' : 'Template:';
							appendText += '; ' + contentModel.toLowerCase() + ' آخر [[';
							if (!new RegExp('^:?' + Morebits.namespaceRegex([10, 828]) + ':', 'i').test(params.tfdtarget)) {
								appendText += contentModel;
							}
							appendText += params.tfdtarget + ']]';
						}
					}
					break;
				case 'mfd':
					if (params.notifyuserspace && params.userspaceOwner && params.userspaceOwner !== initialContrib) {
						appendText += '; تم إعلام {{user|1=' + params.userspaceOwner + '}}';
					}
					break;
				case 'cfd':
					appendText += ' (' + utils.toTLACase(params.xfdcat) + ')';
					if (params.cfdtarget) {
						const categoryOrTemplate = params.xfdcat.charAt(0) === 's' ? 'Template:' : ':Category:';
						appendText += '; ' + params.action + ' إلى [[' + categoryOrTemplate + params.cfdtarget + ']]';
						if (params.xfdcat === 'cfs' && params.cfdtarget2) {
							appendText += ', [[' + categoryOrTemplate + params.cfdtarget2 + ']]';
						}
					}
					break;
				case 'cfds':
					appendText += ' (' + utils.toTLACase(params.xfdcat) + ')';
					// Ensure there's more than just 'Category:'
					if (params.cfdstarget && params.cfdstarget.length > 9) {
						appendText += '; الاسم الجديد: [[:' + params.cfdstarget + ']]';
					}
					break;
				case 'rfd':
					if (params.rfdtarget) {
						appendText += '; الهدف: [[:' + params.rfdtarget + ']]';
						if (params.relatedpage) {
							appendText += ' (تم الإعلام)';
						}
					}
					break;
				case 'rm':
					appendText = params.currentname
						.map((currentname, i) => `# [[:${currentname}]]: ${nominatedLink} at [[WP:RM${params.rmtr ? '/TR' : ''}|]]${params.newname[i] ? `; الاسم الجديد: [[:${params.newname[i]}]]` : ''}`)
						.join('\n');
					break;

				default: // afd or ffd
					break;
			}

			if (initialContrib && params.notifycreator) {
				appendText += '; تم إعلام {{user|1=' + initialContrib + '}}';
			}
			appendText += ' ~~~~~';
			if (params.reason) {
				appendText += "\n#* '''السبب''': " + Morebits.string.formatReasonForLog(params.reason);
			}

			usl.changeTags = Twinkle.changeTags;
			usl.log(appendText, editsummary);
		},

		afd: {
			main: function (apiobj) {
				const response = apiobj.getResponse();
				const titles = response.query.allpages;

				// There has been no earlier entries with this prefix, just go on.
				if (titles.length <= 0) {
					apiobj.params.numbering = apiobj.params.number = '';
				} else {
					let number = 0;
					for (let i = 0; i < titles.length; ++i) {
						const title = titles[i].title;

						// First, simple test, is there an instance with this exact name?
						if (title === 'Wikipedia:Articles for deletion/' + Morebits.pageNameNorm) {
							number = Math.max(number, 1);
							continue;
						}

						const order_re = new RegExp('^' +
							Morebits.string.escapeRegExp('Wikipedia:Articles for deletion/' + Morebits.pageNameNorm) +
							'\\s*\\(\\s*(\\d+)(?:(?:th|nd|rd|st) nom(?:ination)?)?\\s*\\)\\s*$');
						const match = order_re.exec(title);

						// No match; A non-good value
						// Or the match is an unrealistically high number. Avoid false positives such as Wikipedia:Articles for deletion/The Basement (2014), by ignoring matches greater than 100
						if (!match || match[1] > 100) {
							continue;
						}

						// A match, set number to the max of current
						number = Math.max(number, Number(match[1]));
					}
					apiobj.params.number = utils.num2order(parseInt(number, 10) + 1);
					apiobj.params.numbering = number > 0 ? ' (' + apiobj.params.number + ' nomination)' : '';
				}
				apiobj.params.discussionpage = 'Wikipedia:Articles for deletion/' + Morebits.pageNameNorm + apiobj.params.numbering;

				Morebits.Status.info('صفحة المناقشة التالية', '[[' + apiobj.params.discussionpage + ']]');

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = apiobj.params.discussionpage;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، ويتم الآن إعادة التوجيه إلى صفحة المناقشة';

				// Tagging article
				const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'إضافة علامة حذف إلى المقالة');
				wikipedia_page.setFollowRedirect(true); // should never be needed, but if the article is moved, we would want to follow the redirect
				wikipedia_page.setChangeTags(Twinkle.changeTags); // Here to apply to triage
				wikipedia_page.setCallbackParameters(apiobj.params);
				wikipedia_page.load(Twinkle.xfd.callbacks.afd.taggingArticle);
			},
			// Tagging needs to happen before everything else: this means we can check if there is an AfD tag already on the page
			taggingArticle: function (pageobj) {
				let text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				if (!pageobj.exists()) {
					statelem.error("يبدو أن الصفحة غير موجودة؛ ربما تم حذفها بالفعل");
					return;
				}

				// Check for existing AfD tag, for the benefit of new page patrollers
				const textNoAfd = text.replace(/<!--.*AfD.*\n\{\{(?:Article for deletion\/dated|AfDM).*\}\}\n<!--.*(?:\n<!--.*)?AfD.*(?:\s*\n)?/g, '');
				if (text !== textNoAfd) {
					if (confirm('عُثر على علامة AfD في هذه المقالة. ربما سبقك شخص ما إلى ذلك. \nانقر فوق موافق لاستبدال علامة AfD الحالية (غير مستحسن) ، أو إلغاء الأمر للتخلي عن ترشيحك.')) {
						text = textNoAfd;
					} else {
						statelem.error('المقالة موسومة بالفعل بعلامة AfD ، وقد اخترت الإلغاء');
						window.location.reload();
						return;
					}
				}

				// Now we know we want to go ahead with it, trigger the other AJAX requests

				// Mark the page as curated/patrolled, if wanted
				if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
					new Morebits.wiki.Page(Morebits.pageNameNorm).triage();
				}

				// Start discussion page, will also handle pagetriage and delsort listings
				let wikipedia_page = new Morebits.wiki.Page(params.discussionpage, 'إنشاء صفحة مناقشة حذف المقالة');
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.afd.discussionPage);

				// Today's list
				const date = new Morebits.Date(pageobj.getLoadTime());
				wikipedia_page = new Morebits.wiki.Page('Wikipedia:Articles for deletion/Log/' +
					date.format('YYYY MMMM D', 'utc'), "إضافة مناقشة إلى قائمة اليوم");
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.afd.todaysList);
				// Notification to first contributor
				if (params.notifycreator) {
					const thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'));
					thispage.setCallbackParameters(params);
					thispage.setLookupNonRedirectCreator(true); // Look for author of first non-redirect revision
					thispage.lookupCreation((pageobj) => {
						Twinkle.xfd.callbacks.notifyUser(pageobj.getCallbackParameters(), pageobj.getCreator());
					});
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(params, null);
				}

				params.tagText = (params.noinclude ? '<noinclude>{{' : '{{') + (params.number === '' ? 'subst:afd|help=off' : 'subst:afdx|' +
					params.number + '|help=off') + (params.noinclude ? '}}</noinclude>\n' : '}}\n');

				if (pageobj.canEdit()) {
					// Remove some tags that should always be removed on AfD.
					text = text.replace(/\{\{\s*(dated prod|dated prod blp|Prod blp\/dated|Proposed deletion\/dated|prod2|Proposed deletion endorsed|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
					// Then, test if there are speedy deletion-related templates on the article.
					const textNoSd = text.replace(/\{\{\s*(db(-\w*)?|delete|(?:hang|hold)[- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
					if (text !== textNoSd && confirm('عُثر على علامة حذف سريع في هذه الصفحة. هل يجب إزالته؟')) {
						text = textNoSd;
					}

					// Insert tag after short description or any hatnotes
					const wikipage = new Morebits.wikitext.Page(text);
					text = wikipage.insertAfterTemplates(params.tagText, Twinkle.hatnoteRegex).getText();

					pageobj.setPageText(text);
					pageobj.setEditSummary('تم الترشيح للحذف؛ انظر [[:' + params.discussionpage + ']].');
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('nocreate');
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			discussionPage: function (pageobj) {
				const params = pageobj.getCallbackParameters();

				pageobj.setPageText(Twinkle.xfd.callbacks.getDiscussionWikitext('afd', params));
				pageobj.setEditSummary('إنشاء صفحة مناقشة حذف المقالة لـ [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('createonly');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki

					// Actions that should wait on the discussion page actually being created
					// and whose errors shouldn't output the user rationale
					// List at deletion sorting pages
					if (params.delsortCats) {
						params.delsortCats.forEach((cat) => {
							const delsortPage = new Morebits.wiki.Page('Wikipedia:WikiProject Deletion sorting/' + cat, 'إضافة إلى قائمة مناقشات الحذف المتعلقة بـ ' + cat);
							delsortPage.setFollowRedirect(true); // In case a category gets renamed
							delsortPage.setCallbackParameters({ discussionPage: params.discussionpage });
							delsortPage.load(Twinkle.xfd.callbacks.afd.delsortListing);
						});
					}
				});
			},
			todaysList: function (pageobj) {
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const added_data = '{{subst:afd3|pg=' + Morebits.pageNameNorm + params.numbering + '}}\n';
				let text;

				// add date header if the log is found to be empty (a bot should do this automatically)
				if (!pageobj.exists()) {
					text = '{{subst:AfD log}}\n' + added_data;
				} else {
					const old_text = pageobj.getPageText() + '\n'; // MW strips trailing blanks, but we like them, so we add a fake one

					text = old_text.replace(/(<!-- Add new entries to the TOP of the following list -->\n+)/, '$1' + added_data);
					if (text === old_text) {
						const linknode = document.createElement('a');
						linknode.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/Fixing AFD') + '?action=purge');
						linknode.appendChild(document.createTextNode('كيفية إصلاح AFD'));
						statelem.error(['تعذر العثور على البقعة المستهدفة للمناقشة. لإصلاح هذه المشكلة، يرجى الاطلاع على ', linknode, '.']);
						return;
					}
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('إضافة [[:' + params.discussionpage + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchList'));
				pageobj.setCreateOption('recreate');
				pageobj.save();
			},
			delsortListing: function (pageobj) {
				const discussionPage = pageobj.getCallbackParameters().discussionPage;
				const text = pageobj.getPageText().replace('directly below this line -->', 'directly below this line -->\n{{' + discussionPage + '}}');
				pageobj.setPageText(text);
				pageobj.setEditSummary('إدراج [[:' + discussionPage + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setCreateOption('nocreate');
				pageobj.save();
			}
		},

		tfd: {
			main: function (pageobj) {
				const params = pageobj.getCallbackParameters();

				const date = new Morebits.Date(pageobj.getLoadTime());
				params.logpage = 'Wikipedia:Templates for discussion/Log/' + date.format('YYYY MMMM D', 'utc');
				params.discussionpage = params.logpage + '#' + Morebits.pageNameNorm;
				// Add log/discussion page params to the already-loaded page object
				pageobj.setCallbackParameters(params);

				// Defined here rather than below to reduce duplication
				let watchModule, watch_query;
				if (params.scribunto) {
					const watchPref = Twinkle.getPref('xfdWatchPage');
					// action=watch has no way to rely on user
					// preferences (T262912), so we do it manually.
					// The watchdefault pref appears to reliably return '1' (string),
					// but that's not consistent among prefs so might as well be "correct"
					watchModule = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
					if (watchModule) {
						watch_query = {
							action: 'watch',
							titles: [mw.config.get('wgPageName')],
							token: mw.user.tokens.get('watchToken')
						};
						// Only add the expiry if page is unwatched or already temporarily watched
						if (pageobj.getWatched() !== true && watchPref !== 'default' && watchPref !== 'yes') {
							watch_query.expiry = watchPref;
						}
					}
				}

				// Tagging template(s)/module(s)
				if (params.xfdcat === 'tfm') { // Merge
					let wikipedia_otherpage;
					if (params.scribunto) {
						wikipedia_otherpage = new Morebits.wiki.Page(params.otherTemplateName + '/doc', 'Tagging other module documentation with merge tag');

						// Watch tagged module pages as well
						if (watchModule) {
							watch_query.titles.push(params.otherTemplateName);
							new Morebits.wiki.Api('Adding Modules to watchlist', watch_query).post();
						}
					} else {
						wikipedia_otherpage = new Morebits.wiki.Page(params.otherTemplateName, 'Tagging other template with merge tag');
					}
					// Tag this template/module
					Twinkle.xfd.callbacks.tfd.taggingTemplateForMerge(pageobj);

					// Tag other template/module
					wikipedia_otherpage.setFollowRedirect(true);
					const otherParams = $.extend({}, params);
					otherParams.otherTemplateName = Morebits.pageNameNorm;
					wikipedia_otherpage.setCallbackParameters(otherParams);
					wikipedia_otherpage.load(Twinkle.xfd.callbacks.tfd.taggingTemplateForMerge);
				} else { // delete
					if (params.scribunto && Twinkle.getPref('xfdWatchPage') !== 'no') {
						// Watch tagged module page as well
						if (watchModule) {
							new Morebits.wiki.Api('Adding Module to watchlist', watch_query).post();
						}
					}
					Twinkle.xfd.callbacks.tfd.taggingTemplate(pageobj);
				}

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = params.logpage;
				Morebits.wiki.actionCompleted.notice = "اكتمل الترشيح، يتم الآن إعادة التوجيه إلى سجل اليوم";

				// Adding discussion
				const wikipedia_page = new Morebits.wiki.Page(params.logpage, "إضافة مناقشة إلى سجل اليوم");
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.tfd.todaysList);

				// Notification to first contributors
				if (params.notifycreator) {
					const involvedpages = [];
					const seenusers = [];
					involvedpages.push(new Morebits.wiki.Page(mw.config.get('wgPageName')));
					if (params.xfdcat === 'tfm') {
						if (params.scribunto) {
							involvedpages.push(new Morebits.wiki.Page('Module:' + params.tfdtarget));
						} else {
							involvedpages.push(new Morebits.wiki.Page('Template:' + params.tfdtarget));
						}
					}
					involvedpages.forEach((page) => {
						page.setCallbackParameters(params);
						page.lookupCreation((innerpage) => {
							const username = innerpage.getCreator();
							if (!seenusers.includes(username)) {
								seenusers.push(username);
								// Only log once on merge nominations, for the initial template
								Twinkle.xfd.callbacks.notifyUser(innerpage.getCallbackParameters(), username,
									params.xfdcat === 'tfm' && innerpage.getPageName() !== Morebits.pageNameNorm);
							}
						});
					});
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(params, null);
				}

				// Notify developer(s) of script(s) that use(s) the nominated template
				if (params.devpages) {
					const inCategories = mw.config.get('wgCategories');
					const categoryNotificationPageMap = {
						'قوالب يستخدمها لمح البصر': 'نقاش ويكيبيديا:لمح البصر',
						'قوالب يستخدمها أوتوويكي براوزر': 'نقاش ويكيبيديا:أوتوويكي براوزر',
						'Templates used by Ultraviolet': 'Wikipedia talk:Ultraviolet'
					};
					$.each(categoryNotificationPageMap, (category, page) => {
						if (inCategories.includes(category)) {
							Twinkle.xfd.callbacks.notifyUser(params, page, true, 'إخطار ' + page + ' بترشيح القالب');
						}
					});
				}

			},
			taggingTemplate: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				params.tagText = '{{subst:template for discussion|help=off' + (params.templatetype !== 'standard' ? '|type=' + params.templatetype : '') + '}}';

				if (pageobj.getContentModel() === 'sanitized-css') {
					params.tagText = '/* ' + params.tagText + ' */';
				} else {
					if (params.noinclude) {
						params.tagText = '<noinclude>' + params.tagText + '</noinclude>';
					}
					params.tagText += params.templatetype === 'standard' || params.templatetype === 'sidebar' || params.templatetype === 'disabled' ? '\n' : ''; // No newline for inline
				}

				if (pageobj.canEdit() && ['wikitext', 'sanitized-css'].includes(pageobj.getContentModel())) {
					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary('تم ترشيحه للحذف؛ انظر [[:' + params.discussionpage + ']].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					if (params.scribunto) {
						pageobj.setCreateOption('recreate'); // Module /doc might not exist
					}
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			taggingTemplateForMerge: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				params.tagText = '{{subst:tfm|help=off|' + (params.templatetype !== 'standard' ? 'type=' + params.templatetype + '|' : '') +
					'1=' + params.otherTemplateName.replace(new RegExp('^' + Morebits.namespaceRegex([10, 828]) + ':'), '') + '}}';

				if (pageobj.getContentModel() === 'sanitized-css') {
					params.tagText = '/* ' + params.tagText + ' */';
				} else {
					if (params.noinclude) {
						params.tagText = '<noinclude>' + params.tagText + '</noinclude>';
					}
					params.tagText += params.templatetype === 'standard' || params.templatetype === 'sidebar' || params.templatetype === 'disabled' ? '\n' : ''; // No newline for inline
				}

				if (pageobj.canEdit() && ['wikitext', 'sanitized-css'].includes(pageobj.getContentModel())) {
					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary('مدرج للدمج مع [[:' + params.otherTemplateName + ']]؛ انظر [[:' + params.discussionpage + ']].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					if (params.scribunto) {
						pageobj.setCreateOption('recreate'); // Module /doc might not exist
					}
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			todaysList: function (pageobj) {
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const added_data = Twinkle.xfd.callbacks.getDiscussionWikitext(params.xfdcat, params);
				let text;

				// add date header if the log is found to be empty (a bot should do this automatically)
				if (!pageobj.exists()) {
					text = '{{subst:TfD log}}\n' + added_data;
				} else {
					const old_text = pageobj.getPageText();

					text = old_text.replace('-->', '-->\n' + added_data);
					if (text === old_text) {
						statelem.error('فشل العثور على المكان المستهدف للمناقشة');
						return;
					}
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ إضافة ' + (params.xfdcat === 'tfd' ? 'ترشيح للحذف' : 'إدراج للدمج') + ' [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('recreate');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			}
		},

		mfd: {
			main: function (apiobj) {
				const response = apiobj.getResponse();
				const titles = response.query.allpages;

				// There has been no earlier entries with this prefix, just go on.
				if (titles.length <= 0) {
					apiobj.params.numbering = apiobj.params.number = '';
				} else {
					let number = 0;
					for (let i = 0; i < titles.length; ++i) {
						const title = titles[i].title;

						// First, simple test, is there an instance with this exact name?
						if (title === 'Wikipedia:Miscellany for deletion/' + Morebits.pageNameNorm) {
							number = Math.max(number, 1);
							continue;
						}

						const order_re = new RegExp('^' +
							Morebits.string.escapeRegExp('Wikipedia:Miscellany for deletion/' + Morebits.pageNameNorm) +
							'\\s*\\(\\s*(\\d+)(?:(?:th|nd|rd|st) nom(?:ination)?)?\\s*\\)\\s*$');
						const match = order_re.exec(title);

						// No match; A non-good value
						if (!match) {
							continue;
						}

						// A match, set number to the max of current
						number = Math.max(number, Number(match[1]));
					}
					apiobj.params.number = utils.num2order(parseInt(number, 10) + 1);
					apiobj.params.numbering = number > 0 ? ' (' + apiobj.params.number + ' ترشيح)' : '';
				}
				apiobj.params.discussionpage = 'Wikipedia:Miscellany for deletion/' + Morebits.pageNameNorm + apiobj.params.numbering;

				apiobj.statelem.info('التالي بالترتيب هو [[' + apiobj.params.discussionpage + ']]');

				let wikipedia_page;

				// Tagging page
				if (mw.config.get('wgNamespaceNumber') !== 710) { // cannot tag TimedText pages
					wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وضع علامة على الصفحة بعلامة الحذف');
					wikipedia_page.setFollowRedirect(true); // should never be needed, but if the page is moved, we would want to follow the redirect
					wikipedia_page.setCallbackParameters(apiobj.params);
					wikipedia_page.load(Twinkle.xfd.callbacks.mfd.taggingPage);
				}

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = apiobj.params.discussionpage;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، ويتم الآن إعادة التوجيه إلى صفحة المناقشة';

				// Discussion page
				wikipedia_page = new Morebits.wiki.Page(apiobj.params.discussionpage, 'إنشاء صفحة مناقشة الحذف');
				wikipedia_page.setCallbackParameters(apiobj.params);
				wikipedia_page.load(Twinkle.xfd.callbacks.mfd.discussionPage);

				// Today's list
				wikipedia_page = new Morebits.wiki.Page('Wikipedia:Miscellany for deletion', "إضافة المناقشة إلى قائمة اليوم");
				wikipedia_page.setPageSection(2);
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(apiobj.params);
				wikipedia_page.load(Twinkle.xfd.callbacks.mfd.todaysList);

				// Notification to first contributor and/or notification to owner of userspace
				if (apiobj.params.notifycreator || apiobj.params.notifyuserspace) {
					const thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'));
					thispage.setCallbackParameters(apiobj.params);
					thispage.lookupCreation(Twinkle.xfd.callbacks.mfd.sendNotifications);
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(apiobj.params, null);
				}
			},
			taggingPage: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				params.tagText = '{{' + (params.number === '' ? 'mfd' : 'mfdx|' + params.number) + '|help=off}}';

				if (['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'))) {
					params.tagText = '/* ' + params.tagText + ' */\n';
				} else {
					params.tagText += '\n';
					if (params.noinclude) {
						params.tagText = '<noinclude>' + params.tagText + '</noinclude>';
					}
				}

				if (pageobj.canEdit() && ['wikitext', 'javascript', 'css', 'sanitized-css'].includes(pageobj.getContentModel())) {
					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary('تم ترشيحه للحذف؛ انظر [[:' + params.discussionpage + ']].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('nocreate');
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			discussionPage: function (pageobj) {
				const params = pageobj.getCallbackParameters();

				pageobj.setPageText(Twinkle.xfd.callbacks.getDiscussionWikitext('mfd', params));
				pageobj.setEditSummary('إنشاء صفحة مناقشة الحذف لـ [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('createonly');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			},
			todaysList: function (pageobj) {
				let text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const date = new Morebits.Date(pageobj.getLoadTime());
				const date_header = date.format('===MMMM D, YYYY===\n', 'utc');
				const date_header_regex = new RegExp(date.format('(===[\\s]*MMMM[\\s]+D,[\\s]+YYYY[\\s]*===)', 'utc'));
				const added_data = '{{subst:mfd3|pg=' + Morebits.pageNameNorm + params.numbering + '}}';

				if (date_header_regex.test(text)) { // we have a section already
					statelem.info('عُثر على قسم اليوم، والمضي قدمًا لإضافة إدخال جديد');
					text = text.replace(date_header_regex, '$1\n' + added_data);
				} else { // we need to create a new section
					statelem.info('لم يُعثر على قسم لليوم، والمضي قدمًا لإنشاء واحد');
					text = text.replace('===', date_header + added_data + '\n\n===');
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('إضافة [[:' + params.discussionpage + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchList'));
				pageobj.setCreateOption('recreate');
				pageobj.save();
			},
			sendNotifications: function (pageobj) {
				const initialContrib = pageobj.getCreator();
				const params = pageobj.getCallbackParameters();

				// Notify the creator
				if (params.notifycreator) {
					Twinkle.xfd.callbacks.notifyUser(params, initialContrib);
				}

				// Notify the user who owns the subpage if they are not the creator
				params.userspaceOwner = mw.config.get('wgRelevantUserName');
				if (params.notifyuserspace) {
					if (params.userspaceOwner !== initialContrib) {
						// Don't log if notifying creator above, will log then
						Twinkle.xfd.callbacks.notifyUser(params, params.userspaceOwner, params.notifycreator, 'إعلام مالك نطاق المستخدم (' + params.userspaceOwner + ')');
					} else if (!params.notifycreator) {
						// If we thought we would notify the owner but didn't,
						// then we need to log if we didn't notify the creator
						// Twinkle.xfd.callbacks.addToLog(params, null);
						Twinkle.xfd.callbacks.addToLog(params, initialContrib);
					}
				}
			}
		},

		ffd: {
			taggingImage: function (pageobj) {
				let text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				const date = new Morebits.Date(pageobj.getLoadTime()).format('YYYY MMMM D', 'utc');
				params.logpage = 'Wikipedia:Files for discussion/' + date;
				params.discussionpage = params.logpage + '#' + Morebits.pageNameNorm;

				params.tagText = '{{ffd|log=' + date + '|help=off}}\n';
				if (pageobj.canEdit()) {
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');

					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary('مدرج للمناقشة في [[:' + params.discussionpage + ']].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('recreate'); // it might be possible for a file to exist without a description page
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = params.logpage;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، ويتم الآن إعادة التوجيه إلى صفحة المناقشة';

				// Contributor specific edits
				const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'));
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.lookupCreation(Twinkle.xfd.callbacks.ffd.main);
			},
			main: function (pageobj) {
				// this is coming in from lookupCreation...!
				const params = pageobj.getCallbackParameters();
				const initialContrib = pageobj.getCreator();
				params.uploader = initialContrib;

				// Adding discussion
				const wikipedia_page = new Morebits.wiki.Page(params.logpage, "إضافة مناقشة إلى قائمة اليوم");
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.ffd.todaysList);

				// Notification to first contributor
				if (params.notifycreator) {
					Twinkle.xfd.callbacks.notifyUser(params, initialContrib);
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(params, null);
				}
			},
			todaysList: function (pageobj) {
				let text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				// add date header if the log is found to be empty (a bot should do this automatically)
				if (!pageobj.exists()) {
					text = '{{subst:FfD log}}';
				}

				pageobj.setPageText(text + '\n\n' + Twinkle.xfd.callbacks.getDiscussionWikitext('ffd', params));
				pageobj.setEditSummary('إضافة [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('recreate');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			}
		},

		cfd: {
			main: function (pageobj) {
				const params = pageobj.getCallbackParameters();

				const date = new Morebits.Date(pageobj.getLoadTime());
				params.logpage = 'Wikipedia:Categories for discussion/Log/' + date.format('YYYY MMMM D', 'utc');
				params.discussionpage = params.logpage + '#' + Morebits.pageNameNorm;
				// Add log/discussion page params to the already-loaded page object
				pageobj.setCallbackParameters(params);

				// Tagging category
				Twinkle.xfd.callbacks.cfd.taggingCategory(pageobj);

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = params.logpage;
				Morebits.wiki.actionCompleted.notice = "اكتمل الترشيح، ويتم الآن إعادة التوجيه إلى سجل اليوم";

				// Adding discussion to list
				let wikipedia_page = new Morebits.wiki.Page(params.logpage, "إضافة المناقشة إلى القائمة اليوم");
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.cfd.todaysList);

				// Notification to first contributor
				if (params.notifycreator) {
					wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'));
					wikipedia_page.setCallbackParameters(params);
					wikipedia_page.lookupCreation((pageobj) => {
						Twinkle.xfd.callbacks.notifyUser(pageobj.getCallbackParameters(), pageobj.getCreator());
					});
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(params, null);
				}
			},
			taggingCategory: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();

				params.tagText = '{{subst:' + params.xfdcat;
				let editsummary = (mw.config.get('wgNamespaceNumber') === 14 ? 'Category' : 'Stub template') +
					' يتم النظر فيه لـ ' + params.action;
				switch (params.xfdcat) {
					case 'cfd':
					case 'sfd-t':
						break;
					case 'cfc':
						editsummary += ' لمقال';
					// falls through
					case 'cfm':
					case 'cfr':
					case 'sfr-t':
						params.tagText += '|' + params.cfdtarget;
						break;
					case 'cfs':
						params.tagText += '|' + params.cfdtarget + '|' + params.cfdtarget2;
						break;
					default:
						alert('twinklexfd in taggingCategory(): unknown CFD action');
						break;
				}
				params.tagText += '}}\n';
				editsummary += '; انظر [[:' + params.discussionpage + ']].';

				if (pageobj.canEdit()) {
					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary(editsummary);
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('recreate'); // since categories can be populated without an actual page at that title
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			todaysList: function (pageobj) {
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const added_data = Twinkle.xfd.callbacks.getDiscussionWikitext(params.xfdcat, params);
				let text;

				// add date header if the log is found to be empty (a bot should do this automatically)
				if (!pageobj.exists()) {
					text = '{{subst:CfD log}}\n' + added_data;
				} else {
					const old_text = pageobj.getPageText();

					text = old_text.replace('below this line -->', 'below this line -->\n' + added_data);
					if (text === old_text) {
						statelem.error('فشل العثور على المكان المستهدف للمناقشة');
						return;
					}
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('إضافة ' + params.action + ' ترشيح [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('recreate');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			}
		},

		cfds: {
			taggingCategory: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				if (params.xfdcat === 'C2F') {
					params.tagText = '{{subst:cfm-speedy|1=' + params.cfdstarget.replace(/^:?Category:/, '') + '}}\n';
				} else {
					params.tagText = '{{subst:cfr-speedy|1=' + params.cfdstarget.replace(/^:?Category:/, '') + '}}\n';
				}
				params.discussionpage = ''; // CFDS is just a bullet in a bulleted list. There's no section to link to, so we set this to blank. Blank will be recognized by both the generate userspace log code and the generate userspace log edit summary code as "don't wikilink to a section".
				if (pageobj.canEdit()) {
					pageobj.setPageText(params.tagText + text);
					pageobj.setEditSummary('مدرج لإعادة التسمية السريعة؛ انظر [[WP:CFDS|Categories for discussion/Speedy]].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('recreate'); // since categories can be populated without an actual page at that title
					pageobj.save(() => {
						// No user notification for CfDS, so just add this nomination to the user's userspace log
						Twinkle.xfd.callbacks.addToLog(params, null);
					});
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
					// No user notification for CfDS, so just add this nomination to the user's userspace log
					Twinkle.xfd.callbacks.addToLog(params, null);
				}
			},
			addToList: function (pageobj) {
				const old_text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const text = old_text.replace('BELOW THIS LINE -->', 'BELOW THIS LINE -->\n' + Twinkle.xfd.callbacks.getDiscussionWikitext('cfds', params));
				if (text === old_text) {
					statelem.error('فشل العثور على المكان المستهدف للمناقشة');
					return;
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('إضافة [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('recreate');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			}
		},

		rfd: {
			// This gets called both on submit and preview to determine the redirect target
			findTarget: function (params, callback) {
				// Used by regular redirects to find the target, but for all redirects,
				// avoid relying on the client clock to build the log page
				const query = {
					action: 'query',
					curtimestamp: true,
					format: 'json'
				};
				if (document.getElementById('softredirect')) {
					// For soft redirects, define the target early
					// to skip target checks in findTargetCallback
					params.rfdtarget = document.getElementById('softredirect').textContent.replace(/^:+/, '');
				} else {
					// Find current target of redirect
					query.titles = mw.config.get('wgPageName');
					query.redirects = true;
				}
				const wikipedia_api = new Morebits.wiki.Api('العثور على الهدف من إعادة التوجيه', query, Twinkle.xfd.callbacks.rfd.findTargetCallback(callback));
				wikipedia_api.params = params;
				wikipedia_api.post();
			},
			// This is a closure for the callback from the above API request, which gets the target of the redirect
			findTargetCallback: function (callback) {
				return function (apiobj) {
					const response = apiobj.getResponse();
					apiobj.params.curtimestamp = response.curtimestamp;

					if (!apiobj.params.rfdtarget) { // Not a softredirect
						const target = response.query.redirects && response.query.redirects[0].to;
						if (!target) {
							let message = 'لم يُعثر على هدف. يبدو أن هذه الصفحة ليست إعادة توجيه، وأُلغي الطلب';
							if (mw.config.get('wgAction') === 'history') {
								message += '. إذا كانت هذه إعادة توجيه ناعمة، فحاول مرة أخرى من صفحة المحتوى، وليس سجل الصفحة.';
							}
							apiobj.statelem.error(message);
							return;
						}
						apiobj.params.rfdtarget = target;
						const section = response.query.redirects[0].tofragment;
						apiobj.params.section = section;
					}
					callback(apiobj.params);
				};
			},
			main: function (params) {
				const date = new Morebits.Date(params.curtimestamp);
				params.logpage = 'Wikipedia:Redirects for discussion/Log/' + date.format('YYYY MMMM D', 'utc');
				params.discussionpage = params.logpage + '#' + Morebits.pageNameNorm;

				// Tagging redirect
				let wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'إضافة علامة حذف إلى إعادة التوجيه');
				wikipedia_page.setFollowRedirect(false);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.rfd.taggingRedirect);

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = params.logpage;
				Morebits.wiki.actionCompleted.notice = "اكتمل الترشيح، ويتم الآن إعادة التوجيه إلى سجل اليوم";

				// Adding discussion
				wikipedia_page = new Morebits.wiki.Page(params.logpage, "إضافة مناقشة إلى سجل اليوم");
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.rfd.todaysList);

				// Notifications
				if (params.notifycreator || params.relatedpage) {
					const thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'));
					thispage.setCallbackParameters(params);
					thispage.lookupCreation(Twinkle.xfd.callbacks.rfd.sendNotifications);
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else {
					Twinkle.xfd.callbacks.addToLog(params, null);
				}
			},
			taggingRedirect: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				// Imperfect for edit request but so be it
				params.tagText = '{{subst:rfd|' + (mw.config.get('wgNamespaceNumber') === 10 ? 'showontransclusion=1|' : '') + 'content=\n';

				if (pageobj.canEdit()) {
					pageobj.setPageText(params.tagText + text + '\n}}');
					pageobj.setEditSummary('مدرج للمناقشة في [[:' + params.discussionpage + ']].');
					pageobj.setChangeTags(Twinkle.changeTags);
					pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
					pageobj.setCreateOption('nocreate');
					pageobj.save();
				} else {
					Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
				}
			},
			todaysList: function (pageobj) {
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const added_data = Twinkle.xfd.callbacks.getDiscussionWikitext('rfd', params);
				let text;

				// add date header if the log is found to be empty (a bot should do this automatically)
				if (!pageobj.exists()) {
					text = '{{subst:RfD log}}' + added_data;
				} else {
					const old_text = pageobj.getPageText();
					text = old_text.replace(/(<!-- Add new entries directly below this line\.? -->)/, '$1\n' + added_data);
					if (text === old_text) {
						statelem.error('فشل العثور على المكان المستهدف للمناقشة');
						return;
					}
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary('إضافة [[:' + Morebits.pageNameNorm + ']].');
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.setCreateOption('recreate');
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
				});
			},
			sendNotifications: function (pageobj) {
				const initialContrib = pageobj.getCreator();
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				// Notifying initial contributor
				if (params.notifycreator) {
					Twinkle.xfd.callbacks.notifyUser(params, initialContrib);
				}

				// Notifying target page's watchers, if not a soft redirect
				if (params.relatedpage) {
					const targetTalk = new mw.Title(params.rfdtarget).getTalkPage();

					// On the offchance it's a circular redirect
					if (params.rfdtarget === mw.config.get('wgPageName')) {
						statelem.warn('إعادة توجيه دائرية؛ تخطي إشعار صفحة الهدف');
					} else if (document.getElementById('softredirect')) {
						statelem.warn('إعادة توجيه ناعمة؛ تخطي إشعار صفحة الهدف');
						// Don't issue if target talk is the initial contributor's talk or your own
					} else if (targetTalk.getNamespaceId() === 3 && targetTalk.getNameText() === initialContrib) {
						statelem.warn('الهدف هو المساهم الأولي؛ تخطي إشعار صفحة الهدف');
					} else if (targetTalk.getNamespaceId() === 3 && targetTalk.getNameText() === mw.config.get('wgUserName')) {
						statelem.warn('أنت (' + mw.config.get('wgUserName') + ') هو الهدف؛ تخطي إشعار صفحة الهدف');
					} else {
						// Don't log if notifying creator above, will log then
						Twinkle.xfd.callbacks.notifyUser(params, targetTalk.toText(), params.notifycreator, 'إخطار الهدف من إعادة التوجيه بالمناقشة');
						return;
					}
					// If we thought we would notify the target but didn't,
					// we need to log if we didn't notify the creator
					if (!params.notifycreator) {
						Twinkle.xfd.callbacks.addToLog(params, null);
					}
				}
			}
		},

		rm: {
			listAtTalk: function (pageobj) {
				const params = pageobj.getCallbackParameters();
				params.discussionpage = pageobj.getPageName();

				pageobj.setAppendText('\n\n' + Twinkle.xfd.callbacks.getDiscussionWikitext('rm', params));
				pageobj.setEditSummary(`اقتراح نقل ${params.currentname
					.map((currentname, i) => `[[:${currentname}]]${params.newname[i] ? ` إلى [[:${params.newname[i]}]]` : ''}`)
					.join(', ')
					}.`);
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setCreateOption('recreate'); // since the talk page need not exist
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
				pageobj.append(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
					// add this nomination to the user's userspace log
					Twinkle.xfd.callbacks.addToLog(params, null);
				});
			},

			listAtRMTR: function (pageobj) {
				const text = pageobj.getPageText();
				const params = pageobj.getCallbackParameters();
				const statelem = pageobj.getStatusElement();

				const discussionWikitext = Twinkle.xfd.callbacks.getDiscussionWikitext('rm', params);
				const newtext = Twinkle.xfd.insertRMTR(text, discussionWikitext);
				if (text === newtext) {
					statelem.error('فشل العثور على المكان المستهدف للإدخال');
					return;
				}
				pageobj.setPageText(newtext);
				pageobj.setEditSummary(`إضافة [[:${params.currentname.join(']], [[:')}]].`);
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.save(() => {
					Twinkle.xfd.currentRationale = null; // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
					// add this nomination to the user's userspace log
					Twinkle.xfd.callbacks.addToLog(params, null);
				});
			}
		}
	};

	/**
	 * Given the wikitext of the WP:RM/TR page and the wikitext to insert, insert it at the bottom of the ==== Uncontroversial technical requests ==== section.
	 *
	 * @param {string} pageWikitext
	 * @param {string} wikitextToInsert Will typically be `{{subst:RMassist|1=From|2=To|reason=Reason}}`, which expands out to `* {{RMassist/core | 1 = From | 2 = To | discuss = yes | reason = Reason | sig = Signature | requester = YourUserName}}`
	 * @return {string} pageWikitext
	 */
	Twinkle.xfd.insertRMTR = function (pageWikitext, wikitextToInsert) {
		const placementRE = /\n{1,}(==== ?طلبات التراجع عن عمليات النقل غير المتفق عليها ?====)/i;
		return pageWikitext.replace(placementRE, '\n' + wikitextToInsert + '\n\n$1');
	};

	Twinkle.xfd.callback.evaluate = function (e) {
		const form = e.target;

		const params = Morebits.QuickForm.getInputData(form);

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		Twinkle.xfd.currentRationale = params.reason;
		Morebits.Status.onError(Twinkle.xfd.printRationale);

		let query, wikipedia_page, wikipedia_api;
		switch (params.venue) {

			case 'afd': // AFD
				query = {
					action: 'query',
					list: 'allpages',
					apprefix: 'Articles for deletion/' + Morebits.pageNameNorm,
					apnamespace: 4,
					apfilterredir: 'nonredirects',
					aplimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
					format: 'json'
				};
				wikipedia_api = new Morebits.wiki.Api('وسم المقالة بعلامة الحذف', query, Twinkle.xfd.callbacks.afd.main);
				wikipedia_api.params = params;
				wikipedia_api.post();
				break;

			case 'tfd': // TFD
				if (params.tfdtarget) { // remove namespace name
					params.tfdtarget = utils.stripNs(params.tfdtarget);
				}

				// Modules can't be tagged, TfD instructions are to place on /doc subpage
				params.scribunto = mw.config.get('wgPageContentModel') === 'Scribunto';
				if (params.xfdcat === 'tfm') { // Merge
					// Tag this template/module
					if (params.scribunto) {
						wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName') + '/doc', 'وسم توثيق الوحدة النمطية هذه بعلامة الدمج');
						params.otherTemplateName = 'Module:' + params.tfdtarget;
					} else {
						wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم هذا القالب بعلامة الدمج');
						params.otherTemplateName = 'Template:' + params.tfdtarget;
					}
				} else { // delete
					if (params.scribunto) {
						wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName') + '/doc', 'وسم توثيق الوحدة النمطية بعلامة الحذف');
					} else {
						wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم القالب بعلامة الحذف');
					}
				}
				wikipedia_page.setFollowRedirect(true); // should never be needed, but if the page is moved, we would want to follow the redirect
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.tfd.main);
				break;

			case 'mfd': // MFD
				query = {
					action: 'query',
					list: 'allpages',
					apprefix: 'Miscellany for deletion/' + Morebits.pageNameNorm,
					apnamespace: 4,
					apfilterredir: 'nonredirects',
					aplimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
					format: 'json'
				};
				wikipedia_api = new Morebits.wiki.Api('البحث عن ترشيحات سابقة لهذه الصفحة', query, Twinkle.xfd.callbacks.mfd.main);
				wikipedia_api.params = params;
				wikipedia_api.post();
				break;

			case 'ffd': // FFD
				// Tagging file
				// A little out of order with this coming before 'main',
				// but tagging doesn't need the uploader parameter,
				// while everything else does, so tag then get the uploader
				wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'إضافة علامة حذف إلى صفحة الملف');
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.ffd.taggingImage);
				break;

			case 'cfd':
				if (params.cfdtarget) {
					params.cfdtarget = utils.stripNs(params.cfdtarget);
				} else {
					params.cfdtarget = ''; // delete
				}
				if (params.cfdtarget2) { // split
					params.cfdtarget2 = utils.stripNs(params.cfdtarget2);
				}

				// Used for customized actions in edit summaries and the notification template
				var summaryActions = {
					cfd: 'حذف',
					'sfd-t': 'حذف',
					cfm: 'دمج',
					cfr: 'إعادة تسمية',
					'sfr-t': 'إعادة تسمية',
					cfs: 'تقسيم',
					cfc: 'تحويل'
				};
				params.action = summaryActions[params.xfdcat];

				// Tagging category
				wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم التصنيف بعلامة ' + params.action);
				wikipedia_page.setFollowRedirect(true); // should never be needed, but if the page is moved, we would want to follow the redirect
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.cfd.main);
				break;

			case 'cfds':
				// add namespace name if missing
				params.cfdstarget = utils.addNs(params.cfdstarget, 14);

				var logpage = 'Wikipedia:Categories for discussion/Speedy';

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = logpage;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، والآن إعادة التوجيه إلى صفحة المناقشة';

				// Tagging category
				wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم التصنيف بعلامة إعادة التسمية');
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.cfds.taggingCategory);

				// Adding discussion to list
				wikipedia_page = new Morebits.wiki.Page(logpage, 'إضافة مناقشة إلى القائمة');
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.xfd.callbacks.cfds.addToList);

				break;

			case 'rfd':
				// find target and pass main as the callback
				Twinkle.xfd.callbacks.rfd.findTarget(params, Twinkle.xfd.callbacks.rfd.main);
				break;

			case 'rm':
				var nomPageName = params.rmtr ?
					'Wikipedia:Requested moves/Technical requests' :
					new mw.Title(Morebits.pageNameNorm).getTalkPage().toText();

				Morebits.wiki.actionCompleted.redirect = nomPageName;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، والآن إعادة التوجيه إلى صفحة المناقشة';

				wikipedia_page = new Morebits.wiki.Page(nomPageName, params.rmtr ? 'إضافة إدخال في WP:RM/TR' : 'إضافة إدخال في صفحة النقاش');
				wikipedia_page.setFollowRedirect(true);
				wikipedia_page.setCallbackParameters(params);

				if (params.rmtr) {
					wikipedia_page.load(Twinkle.xfd.callbacks.rm.listAtRMTR);
				} else {
					// listAtTalk uses .append(), so no need to load the page
					Twinkle.xfd.callbacks.rm.listAtTalk(wikipedia_page);
				}
				break;

			default:
				alert('twinklexfd: مكان مناقشة XFD غير معروف');
				break;
		}
	};

	Twinkle.addInitCallback(Twinkle.xfd, 'xfd');
}());

// </nowiki>
