// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinklespeedy.js: CSD module
	 ****************************************
	 * Mode of invocation:     Tab ("CSD")
	 * Active on:              Non-special, existing pages
	 *
	 * NOTE FOR DEVELOPERS:
	 *   If adding a new criterion, add it to the appropriate places at the top of
	 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
	 *   in twinkle.js, and add your new criterion to those if you think it would be
	 *   good.
	 */

	Twinkle.speedy = function twinklespeedy() {
		// Disable on:
		// * special pages
		// * non-existent pages
		if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
			return;
		}

		Twinkle.addPortletLink(Twinkle.speedy.callback, 'CSD', 'tw-csd', Morebits.userIsSysop ? 'حذف الصفحة وفقًا لـ WP: CSD' : 'طلب حذف سريع وفقًا لـ WP: CSD');
	};

	// This function is run when the CSD tab/header link is clicked
	Twinkle.speedy.callback = function twinklespeedyCallback() {
		Twinkle.speedy.initDialog(Morebits.userIsSysop ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
	};

	// Used by unlink feature
	Twinkle.speedy.dialog = null;
	// Used throughout
	Twinkle.speedy.hasCSD = !!$('#delete-reason').length;

	// Prepares the speedy deletion dialog and displays it
	Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
		Twinkle.speedy.dialog = new Morebits.SimpleWindow(Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight'));
		const dialog = Twinkle.speedy.dialog;
		dialog.setTitle('اختر معايير الحذف السريع');
		dialog.setScriptName('Twinkle');
		dialog.addFooterLink('سياسة الحذف السريع', 'WP:CSD');
		dialog.addFooterLink('تفضيلات CSD', 'WP:TW/PREF#speedy');
		dialog.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#speedy');
		dialog.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(callbackfunc, Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null);
		if (Morebits.userIsSysop) {
			form.append({
				type: 'checkbox',
				list: [
					{
						label: 'ضع علامة على الصفحة فقط ، لا تحذفها',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: 'إذا كنت تريد فقط وضع علامة على الصفحة ، بدلاً من حذفها الآن',
						checked: !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
						event: function (event) {
							const cForm = event.target.form;
							const cChecked = event.target.checked;
							// enable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable redirects checkbox
							cForm.redirects.checked = !cChecked;
							// enable delete multiple
							cForm.delmultiple.checked = false;
							// enable notify checkbox
							cForm.notify.checked = cChecked;
							// enable deletion notification checkbox
							cForm.warnusertalk.checked = !cChecked && !Twinkle.speedy.hasCSD;
							// enable multiple
							cForm.multiple.checked = false;
							// enable requesting creation protection
							cForm.salting.checked = false;

							Twinkle.speedy.callback.modeChanged(cForm);

							event.stopPropagation();
						}
					}
				]
			});

			const deleteOptions = form.append({
				type: 'div',
				name: 'delete_options'
			});
			deleteOptions.append({
				type: 'header',
				label: 'خيارات متعلقة بالحذف'
			});
			if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) { // hide option for user pages, to avoid accidentally deleting user talk page
				deleteOptions.append({
					type: 'checkbox',
					list: [
						{
							label: 'حذف صفحة النقاش أيضًا',
							value: 'talkpage',
							name: 'talkpage',
							tooltip: 'يقوم هذا الخيار بحذف صفحة نقاش الصفحة بالإضافة إلى ذلك. إذا اخترت معيار F8 (تم نقله إلى Commons) ، فسيتم تجاهل هذا الخيار ولن يتم حذف صفحة النقاش.',
							checked: Twinkle.getPref('deleteTalkPageOnDelete'),
							event: function (event) {
								event.stopPropagation();
							}
						}
					]
				});
			}
			deleteOptions.append({
				type: 'checkbox',
				list: [
					{
						label: 'حذف جميع عمليات إعادة التوجيه أيضًا',
						value: 'redirects',
						name: 'redirects',
						tooltip: 'يقوم هذا الخيار بحذف جميع عمليات إعادة التوجيه الواردة بالإضافة إلى ذلك. تجنب هذا الخيار لعمليات الحذف الإجرائية (مثل النقل / الدمج).',
						checked: Twinkle.getPref('deleteRedirectsOnDelete'),
						event: function (event) {
							event.stopPropagation();
						}
					},
					{
						label: 'الحذف بموجب معايير متعددة',
						value: 'delmultiple',
						name: 'delmultiple',
						tooltip: 'عند تحديده ، يمكنك تحديد العديد من المعايير التي تنطبق على الصفحة. على سبيل المثال ، G11 و A7 هما مزيج شائع للمقالات.',
						event: function (event) {
							Twinkle.speedy.callback.modeChanged(event.target.form);
							event.stopPropagation();
						}
					},
					{
						label: 'إخطار منشئ الصفحة بحذف الصفحة',
						value: 'warnusertalk',
						name: 'warnusertalk',
						tooltip: 'سيتم وضع قالب إشعار في صفحة نقاش المنشئ ، إذا كان لديك إشعار ممكّن في تفضيلات Twinkle الخاصة بك' +
							'للمعيار الذي تختاره وتم تحديد هذا المربع. يمكن الترحيب بالمنشئ أيضًا.',
						checked: !Twinkle.speedy.hasCSD,
						event: function (event) {
							event.stopPropagation();
						}
					}
				]
			});
		}

		const tagOptions = form.append({
			type: 'div',
			name: 'tag_options'
		});

		if (Morebits.userIsSysop) {
			tagOptions.append({
				type: 'header',
				label: 'خيارات متعلقة بالعلامة'
			});
		}

		tagOptions.append({
			type: 'checkbox',
			list: [
				{
					label: 'إخطار منشئ الصفحة إن أمكن',
					value: 'notify',
					name: 'notify',
					tooltip: 'سيتم وضع قالب إشعار في صفحة نقاش المنشئ ، إذا كان لديك إشعار ممكّن في تفضيلات Twinkle الخاصة بك' +
						'للمعيار الذي تختاره وتم تحديد هذا المربع. يمكن الترحيب بالمنشئ أيضًا.',
					checked: !Morebits.userIsSysop || !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
					event: function (event) {
						event.stopPropagation();
					}
				},
				{
					label: 'ضع علامة على حماية الإنشاء (salting) أيضًا',
					value: 'salting',
					name: 'salting',
					tooltip: 'عند تحديده ، ستكون علامة الحذف السريع مصحوبة بعلامة {{salt}} تطلب من المسؤول الذي يحذف تطبيق حماية الإنشاء. حدد فقط ما إذا كانت هذه الصفحة قد أعيد إنشاؤها بشكل متكرر.',
					event: function (event) {
						event.stopPropagation();
					}
				},
				{
					label: 'ضع علامة بمعايير متعددة',
					value: 'multiple',
					name: 'multiple',
					tooltip: 'عند تحديده ، يمكنك تحديد العديد من المعايير التي تنطبق على الصفحة. على سبيل المثال ، G11 و A7 هما مزيج شائع للمقالات.',
					event: function (event) {
						Twinkle.speedy.callback.modeChanged(event.target.form);
						event.stopPropagation();
					}
				}
			]
		});

		form.append({
			type: 'div',
			id: 'prior-deletion-count',
			style: 'font-style: italic'
		});

		form.append({
			type: 'div',
			name: 'work_area',
			label: 'فشل تهيئة وحدة CSD. يرجى المحاولة مرة أخرى أو إخبار مطوري Twinkle بالمشكلة.'
		});

		if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
			form.append({ type: 'submit', className: 'tw-speedy-submit' }); // Renamed in modeChanged
		}

		const result = form.render();
		dialog.setContent(result);
		dialog.display();

		Twinkle.speedy.callback.modeChanged(result);

		// Check for prior deletions.  Just once, upon init
		Twinkle.speedy.callback.priorDeletionCount();
	};

	Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
		const namespace = mw.config.get('wgNamespaceNumber');

		// first figure out what mode we're in
		const mode = {
			isSysop: !!form.tag_only && !form.tag_only.checked,
			isMultiple: form.tag_only && !form.tag_only.checked ? form.delmultiple.checked : form.multiple.checked,
			isRadioClick: Twinkle.getPref('speedySelectionStyle') === 'radioClick'
		};

		if (mode.isSysop) {
			$('[name=delete_options]').show();
			$('[name=tag_options]').hide();
			$('button.tw-speedy-submit').text('حذف الصفحة');
		} else {
			$('[name=delete_options]').hide();
			$('[name=tag_options]').show();
			$('button.tw-speedy-submit').text('وضع علامة على الصفحة');
		}

		const work_area = new Morebits.QuickForm.Element({
			type: 'div',
			name: 'work_area'
		});

		if (mode.isMultiple && mode.isRadioClick) {
			const evaluateType = mode.isSysop ? 'evaluateSysop' : 'evaluateUser';

			work_area.append({
				type: 'div',
				label: 'عند الانتهاء من اختيار المعايير ، انقر فوق:'
			});
			work_area.append({
				type: 'button',
				name: 'submit-multiple',
				label: mode.isSysop ? 'حذف الصفحة' : 'وضع علامة على الصفحة',
				event: function (event) {
					Twinkle.speedy.callback[evaluateType](event);
					event.stopPropagation();
				}
			});
		}

		const appendList = function (headerLabel, csdList) {
			work_area.append({ type: 'header', label: headerLabel });
			work_area.append({ type: mode.isMultiple ? 'checkbox' : 'radio', name: 'csd', list: Twinkle.speedy.generateCsdList(csdList, mode) });
		};

		if (mode.isSysop && !mode.isMultiple) {
			appendList('الأساس المنطقي المخصص', Twinkle.speedy.customRationale);
		}

		if (namespace % 2 === 1 && namespace !== 3) {
			// show db-talk on talk pages, but not user talk pages
			appendList('صفحات النقاش', Twinkle.speedy.talkList);
		}

		if (!Morebits.isPageRedirect()) {
			switch (namespace) {
				case 0: // article
				case 1: // talk
					appendList('مقالات', Twinkle.speedy.articleList);
					break;

				case 2: // user
				case 3: // user talk
					appendList('صفحات المستخدم', Twinkle.speedy.userList);
					break;

				case 6: // file
				case 7: // file talk
					appendList('الملفات', Twinkle.speedy.fileList);
					if (!mode.isSysop) {
						work_area.append({ type: 'div', label: 'يمكن وضع علامة على CSD F4 (بدون ترخيص) و F5 (استخدام غير مجاني يتيم) و F6 (بدون أساس منطقي للاستخدام غير المجاني) و F11 (بدون إذن) باستخدام علامة التبويب "DI" في Twinkle.' });
					}
					break;

				case 14: // category
				case 15: // category talk
					appendList('التصنيفات', Twinkle.speedy.categoryList);
					break;

				default:
					break;
			}
		} else {
			if (namespace === 2 || namespace === 3) {
				appendList('صفحات المستخدم', Twinkle.speedy.userList);
			}
			appendList('عمليات إعادة التوجيه', Twinkle.speedy.redirectList);
		}

		let generalCriteria = Twinkle.speedy.generalList;

		// custom rationale lives under general criteria when tagging
		if (!mode.isSysop) {
			generalCriteria = Twinkle.speedy.customRationale.concat(generalCriteria);
		}
		appendList('المعايير العامة', generalCriteria);

		const old_area = Morebits.QuickForm.getElements(form, 'work_area')[0];
		form.replaceChild(work_area.render(), old_area);

		// if sysop, check if CSD is already on the page and fill in custom rationale
		if (mode.isSysop && Twinkle.speedy.hasCSD) {
			const customOption = $('input[name=csd][value=reason]')[0];
			if (customOption) {
				if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
					// force listeners to re-init
					customOption.click();
					customOption.parentNode.appendChild(customOption.subgroup);
				}
				customOption.subgroup.querySelector('input').value = decodeURIComponent($('#delete-reason').text()).replace(/\+/g, ' ');
			}
		}
	};

	Twinkle.speedy.callback.priorDeletionCount = function () {
		const query = {
			action: 'query',
			format: 'json',
			list: 'logevents',
			letype: 'delete',
			leaction: 'delete/delete', // Just pure page deletion, no redirect overwrites or revdel
			letitle: mw.config.get('wgPageName'),
			leprop: '', // We're just counting we don't actually care about the entries
			lelimit: 5 // A little bit goes a long way
		};

		new Morebits.wiki.Api('جارٍ التحقق من عمليات الحذف السابقة', query, ((apiobj) => {
			const response = apiobj.getResponse();
			const delCount = response.query.logevents.length;
			if (delCount) {
				let message = delCount + ' عملية حذف سابقة';
				if (delCount > 1) {
					message += 'عمليات';
					if (response.continue) {
						message = 'أكثر من ' + message;
					}

					// 3+ seems problematic
					if (delCount >= 3) {
						$('#prior-deletion-count').css('color', 'red');
					}
				}

				// Provide a link to page logs (CSD templates have one for sysops)
				const link = Morebits.htmlNode('a', '(سجلات)');
				link.setAttribute('href', mw.util.getUrl('Special:Log', { page: mw.config.get('wgPageName') }));
				link.setAttribute('target', '_blank');

				$('#prior-deletion-count').text(message + ' '); // Space before log link
				$('#prior-deletion-count').append(link);
			}
		})).post();
	};

	Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {

		const pageNamespace = mw.config.get('wgNamespaceNumber');

		const openSubgroupHandler = function (e) {
			$(e.target.form).find('input').prop('disabled', true);
			$(e.target.form).children().css('color', 'gray');
			$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
			$(e.target).parent().find('input:text')[0].focus();
			e.stopPropagation();
		};
		const submitSubgroupHandler = function (e) {
			const evaluateType = mode.isSysop ? 'evaluateSysop' : 'evaluateUser';
			Twinkle.speedy.callback[evaluateType](e);
			e.stopPropagation();
		};

		return $.map(list, (critElement) => {
			const criterion = $.extend({}, critElement);

			if (mode.isMultiple) {
				if (criterion.hideWhenMultiple) {
					return null;
				}
				if (criterion.hideSubgroupWhenMultiple) {
					criterion.subgroup = null;
				}
			} else {
				if (criterion.hideWhenSingle) {
					return null;
				}
				if (criterion.hideSubgroupWhenSingle) {
					criterion.subgroup = null;
				}
			}

			if (mode.isSysop) {
				if (criterion.hideWhenSysop) {
					return null;
				}
				if (criterion.hideSubgroupWhenSysop) {
					criterion.subgroup = null;
				}
			} else {
				if (criterion.hideWhenUser) {
					return null;
				}
				if (criterion.hideSubgroupWhenUser) {
					criterion.subgroup = null;
				}
			}

			if (Morebits.isPageRedirect() && criterion.hideWhenRedirect) {
				return null;
			}

			if (criterion.showInNamespaces && !criterion.showInNamespaces.includes(pageNamespace)) {
				return null;
			}
			if (criterion.hideInNamespaces && criterion.hideInNamespaces.includes(pageNamespace)) {
				return null;
			}

			if (criterion.subgroup && !mode.isMultiple && mode.isRadioClick) {
				if (Array.isArray(criterion.subgroup)) {
					criterion.subgroup = criterion.subgroup.concat({
						type: 'button',
						name: 'submit',
						label: mode.isSysop ? 'حذف الصفحة' : 'وضع علامة على الصفحة',
						event: submitSubgroupHandler
					});
				} else {
					criterion.subgroup = [
						criterion.subgroup,
						{
							type: 'button',
							name: 'submit', // ends up being called "csd.submit" so this is OK
							label: mode.isSysop ? 'حذف الصفحة' : 'وضع علامة على الصفحة',
							event: submitSubgroupHandler
						}
					];
				}
				// FIXME: does this do anything?
				criterion.event = openSubgroupHandler;
			}

			return criterion;
		});
	};

	Twinkle.speedy.customRationale = [
		{
			label: 'الأساس المنطقي المخصص' + (Morebits.userIsSysop ? ' (سبب الحذف المخصص)' : ' باستخدام قالب {{db}}'),
			value: 'reason',
			tooltip: '{{db}} هي اختصار لعبارة "حذف بسبب". يجب أن يظل أحد معايير الحذف الأخرى على الأقل ساريًا على الصفحة ، ويجب عليك ذكر ذلك في الأساس المنطقي الخاص بك. هذا ليس "حلًا شاملاً" عندما لا يمكنك العثور على أي معايير تناسب.',
			subgroup: {
				name: 'reason_1',
				type: 'input',
				label: 'الأساس المنطقي:',
				size: 60
			},
			hideWhenMultiple: true
		}
	];

	Twinkle.speedy.talkList = [
		{
			label: 'G8: صفحات النقاش التي لا تحتوي على صفحة موضوع مقابلة',
			value: 'talk',
			tooltip: 'يستثني هذا أي صفحة مفيدة للمشروع - على وجه الخصوص ، صفحات نقاش المستخدمين وأرشيفات صفحات النقاش وصفحات النقاش للملفات الموجودة على ويكيميديا ​​كومنز.'
		}
	];

	Twinkle.speedy.fileList = [
		{
			label: 'F1: ملف زائد عن الحاجة',
			value: 'redundantimage',
			tooltip: 'أي ملف عبارة عن نسخة مكررة زائدة عن الحاجة ، بنفس تنسيق الملف وبنفس الدقة أو بدقة أقل ، لشيء آخر في ويكيبيديا. وبالمثل ، وسائط أخرى عبارة عن نسخة مكررة زائدة عن الحاجة ، بنفس التنسيق وبنفس الجودة أو بجودة أقل. لا ينطبق هذا على الملفات المكررة على ويكيميديا ​​كومنز ، بسبب مشكلات الترخيص ؛ يجب وضع علامة عليها باستخدام {{subst:ncd|Image:newname.ext}} أو {{subst:ncd}} بدلاً من ذلك',
			subgroup: {
				name: 'redundantimage_filename',
				type: 'input',
				label: 'الملف الذي يمثل هذا الملف نسخة زائدة منه:',
				tooltip: 'يمكن حذف البادئة "ملف:".'
			}
		},
		{
			label: 'F2: ملف تالف أو مفقود أو فارغ',
			value: 'noimage',
			tooltip: 'قبل حذف هذا النوع من الملفات ، تحقق من أن محرك MediaWiki لا يمكنه قراءته عن طريق معاينة صورة مصغرة تم تغيير حجمها منه. يتضمن ذلك أيضًا صفحات وصف ملف فارغة (أي بدون محتوى) لملفات Commons'
		},
		{
			label: 'F2: صفحة وصف ملف غير ضرورية لملف على Commons',
			value: 'fpcfail',
			tooltip: 'صورة مستضافة على Commons ، ولكن مع علامات أو معلومات على صفحة وصف ويكيبيديا الإنجليزية الخاصة بها لم تعد هناك حاجة إليها. (على سبيل المثال ، مرشح صورة مميزة فاشلة).',
			hideWhenMultiple: true
		},
		{
			label: 'F3: ترخيص غير لائق',
			value: 'noncom',
			tooltip: 'الملفات المرخصة على أنها "للاستخدام غير التجاري فقط" أو "الاستخدام غير المشتق" أو "المستخدمة بإذن" والتي تم تحميلها في أو بعد 2005-05-19 ، باستثناء الحالات التي ثبت فيها امتثالها للمعايير المحدودة لاستخدام المحتوى غير المجاني. يتضمن ذلك الملفات المرخصة بموجب "ترخيص المشاع الإبداعي غير التجاري". يمكن أيضًا حذف هذه الملفات التي تم تحميلها قبل 2005-05-19 بسرعة إذا لم يتم استخدامها في أي مقالات'
		},
		{
			label: 'F4: نقص معلومات الترخيص',
			value: 'unksource',
			tooltip: 'الملفات الموجودة في فئة "ملفات ذات مصدر غير معروف" أو "ملفات ذات حالة حقوق نشر غير معروفة" أو "ملفات بدون علامة حقوق طبع ونشر" التي تم وضع علامة عليها بقالب يضعها في الفئة لأكثر من سبعة أيام ، بغض النظر عن وقت التحميل. لاحظ أن المستخدمين يحددون أحيانًا مصدرهم في ملخص التحميل ، لذا تأكد من التحقق من ظروف الملف.',
			hideWhenUser: true
		},
		{
			label: 'F5: ملف محمي بحقوق الطبع والنشر غير مجاني غير مستخدم',
			value: 'f5',
			tooltip: 'الملفات التي ليست بموجب ترخيص مجاني أو في المجال العام والتي لا يتم استخدامها في أي مقال ، والتي يقتصر استخدامها على مقال محذوف ، والتي من غير المحتمل جدًا استخدامها في أي مقال آخر. يمكن تقديم استثناءات معقولة للملفات التي تم تحميلها لمقال قادم. بالنسبة للملفات الأخرى غير المجانية غير المستخدمة ، استخدم الخيار "الاستخدام غير المجاني اليتيم" في علامة التبويب DI في Twinkle.',
			hideWhenUser: true
		},
		{
			label: 'F6: فقدان الأساس المنطقي للاستخدام العادل',
			value: 'norat',
			tooltip: 'يمكن حذف أي ملف بدون أساس منطقي للاستخدام العادل بعد سبعة أيام من تحميله. قوالب الاستخدام العادل القياسية لا تشكل أساسًا منطقيًا للاستخدام العادل. يجب عدم حذف الملفات التي تم تحميلها قبل 2006-05-04 على الفور ؛ بدلاً من ذلك ، يجب إخطار القائم بالتحميل بالحاجة إلى أساس منطقي للاستخدام العادل. يمكن وضع علامة على الملفات التي تم تحميلها بعد 2006-05-04 باستخدام الخيار "لا يوجد أساس منطقي للاستخدام غير المجاني" في وحدة DI في Twinkle. يمكن العثور على هذه الملفات في الفئات الفرعية المؤرخة من الفئة: ملفات بدون أساس منطقي للاستخدام غير المجاني.',
			hideWhenUser: true
		},
		{
			label: 'F7: وسائط الاستخدام العادل من وكالة صور تجارية ليست موضوع تعليق موثق',
			value: 'badfairuse',
			tooltip: 'تعتبر الصور أو الوسائط غير المجانية من مصدر تجاري (مثل Associated Press أو Getty) ، حيث لا يكون الملف نفسه موضوع تعليق موثق ، مطالبة غير صالحة بالاستخدام العادل وتفشل في المتطلبات الصارمة لـ WP:NFCC. بالنسبة للحالات التي تتطلب فترة انتظار (أساس منطقي غير صالح أو متنازع عليه أو صور قابلة للاستبدال) ، استخدم الخيارات الموجودة في علامة التبويب DI في Twinkle.',
			subgroup: {
				name: 'badfairuse_rationale',
				type: 'input',
				label: 'شرح اختياري:',
				size: 60
			},
			hideWhenMultiple: true
		},
		{
			label: 'F8: الملف متاح كنسخة متطابقة أو ذات دقة أعلى على ويكيميديا ​​كومنز',
			value: 'commons',
			tooltip: 'بشرط استيفاء الشروط التالية: 1: تنسيق الملف لكلا الصورتين هو نفسه. 2: ترخيص الملف وحالة المصدر يتجاوزان أي شك معقول ، والترخيص مقبول بلا شك في Commons. 3: جميع المعلومات الموجودة في صفحة وصف الملف موجودة في صفحة وصف ملف Commons. يتضمن ذلك سجل التحميل الكامل مع روابط لصفحات المستخدم المحلي للقائم بالتحميل. 4: الملف غير محمي ، ولا تحتوي صفحة وصف الملف على طلب بعدم نقله إلى Commons. 5: إذا كان الملف متاحًا في Commons باسم مختلف عن الاسم المحلي ، فيجب تحديث جميع المراجع المحلية إلى الملف للإشارة إلى العنوان المستخدم في Commons. 6: بالنسبة لملفات {{c-uploaded}}: يمكن حذفها بسرعة بمجرد إيقافها عن الصفحة الرئيسية',
			subgroup: {
				name: 'commons_filename',
				type: 'input',
				label: 'اسم الملف على Commons:',
				value: Morebits.pageNameNorm,
				tooltip: 'يمكن ترك هذا فارغًا إذا كان للملف نفس الاسم الموجود هنا على Commons. البادئة "ملف:" اختيارية.'
			},
			hideWhenMultiple: true
		},
		{
			label: 'F9: انتهاك حقوق الطبع والنشر لا لبس فيه',
			value: 'imgcopyvio',
			tooltip: 'تم نسخ الملف من موقع ويب أو مصدر آخر ليس لديه ترخيص متوافق مع ويكيبيديا ، ولا يدعي القائم بالتحميل استخدامًا عادلاً ولا يقدم تأكيدًا ذا مصداقية لإذن الاستخدام المجاني. تشمل المصادر التي ليس لديها ترخيص متوافق مع ويكيبيديا مكتبات الصور المخزنة مثل Getty Images أو Corbis. يجب مناقشة انتهاكات حقوق الطبع والنشر غير الصارخة في Wikipedia:Files for deletion',
			subgroup: [
				{
					name: 'imgcopyvio_url',
					type: 'input',
					label: 'عنوان URL الخاص بـ copyvio ، بما في ذلك "http://". إذا كان copyvio من مصدر غير إنترنت ولا يمكنك تقديم عنوان URL ، فيجب عليك استخدام مربع الأساس المنطقي للحذف.',
					size: 60
				},
				{
					name: 'imgcopyvio_rationale',
					type: 'input',
					label: 'الأساس المنطقي للحذف لـ copyvios غير الإنترنت:',
					size: 60
				}
			]
		},
		{
			label: 'F11: لا يوجد دليل على الإذن',
			value: 'nopermission',
			tooltip: 'إذا حدد القائم بالتحميل ترخيصًا وسمى طرفًا ثالثًا كمصدر / صاحب حقوق الطبع والنشر دون تقديم دليل على أن هذا الطرف الثالث قد وافق في الواقع ، فيمكن حذف العنصر بعد سبعة أيام من إخطار القائم بالتحميل',
			hideWhenUser: true
		},
		{
			label: 'G8: صفحة وصف ملف بدون ملف مطابق',
			value: 'imagepage',
			tooltip: 'هذا مخصص للاستخدام فقط عندما لا يكون الملف موجودًا على الإطلاق. يجب أن تستخدم الملفات التالفة وصفحات الوصف المحلية للملفات الموجودة على Commons F2 ؛ يجب أن تستخدم عمليات إعادة التوجيه غير المعقولة R3 ؛ ويجب أن تستخدم عمليات إعادة توجيه Commons المكسورة R4.'
		}
	];

	Twinkle.speedy.articleList = [
		{
			label: 'A1: لا يوجد سياق. مقالات تفتقر إلى سياق كافٍ لتحديد موضوع المقالة.',
			value: 'nocontext',
			tooltip: 'مثال: "إنه رجل مضحك بسيارة حمراء. إنه يجعل الناس يضحكون." ينطبق هذا فقط على المقالات القصيرة جدًا. يختلف السياق عن المحتوى ، الذي يتم تناوله في A3 ، أدناه.',
			hideInNamespaces: [2] // Not applicable in userspace
		},
		{
			label: 'A2: مقالات بلغة أجنبية موجودة في مشروع ويكيميديا ​​آخر',
			value: 'foreign',
			tooltip: 'إذا كانت المقالة المعنية غير موجودة في مشروع آخر ، فيجب استخدام القالب {{notenglish}} بدلاً من ذلك. يجب إدراج جميع المقالات بلغة غير الإنجليزية التي لا تفي بهذه المعايير (ولا تفي بأي معايير أخرى للحذف السريع) في صفحات تحتاج إلى ترجمة (PNT) للمراجعة والترجمة المحتملة',
			subgroup: {
				name: 'foreign_source',
				type: 'input',
				label: 'رابط Interwiki إلى المقالة على ويكي اللغة الأجنبية:',
				tooltip: 'على سبيل المثال ، fr:Bonjour'
			}
		},
		{
			label: 'A3: لا يوجد محتوى على الإطلاق',
			value: 'nocontent',
			tooltip: 'أي مقال يتكون فقط من روابط في أماكن أخرى (بما في ذلك الارتباطات التشعبية وعلامات الفئة وأقسام "انظر أيضًا") أو إعادة صياغة للعنوان و / أو محاولات للتوافق مع الشخص أو المجموعة التي يحملها عنوانه. لا يشمل ذلك صفحات التوضيح'
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (الأشخاص أو المجموعات أو الشركات أو محتوى الويب أو الحيوانات الفردية أو الأحداث المنظمة)',
			value: 'a7',
			tooltip: 'مقال عن شخص حقيقي أو مجموعة من الأشخاص أو فرقة موسيقية أو نادي أو شركة أو محتوى ويب أو حيوان فردي أو جولة أو حفلة لا يؤكد أهمية أو أهمية موضوعه. إذا كان مثيرًا للجدل ، أو إذا أدت AfD سابقة إلى الاحتفاظ بالمقال ، فيجب ترشيح المقال لـ AfD بدلاً من ذلك',
			hideWhenSingle: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (شخص)',
			value: 'person',
			tooltip: 'مقال عن شخص حقيقي لا يؤكد أهمية أو أهمية موضوعه. إذا كان مثيرًا للجدل ، أو إذا كانت هناك AfD سابقة أدت إلى الاحتفاظ بالمقال ، فيجب ترشيح المقال لـ AfD بدلاً من ذلك',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (موسيقي (موسيقيون) أو فرقة)',
			value: 'band',
			tooltip: 'مقال عن فرقة موسيقية أو مغنية أو موسيقي أو فرقة موسيقية لا يؤكد أهمية أو أهمية الموضوع',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (نادي أو جمعية أو مجموعة)',
			value: 'club',
			tooltip: 'مقال عن نادي أو جمعية أو مجموعة لا يؤكد أهمية أو أهمية الموضوع',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (شركة أو منظمة)',
			value: 'corp',
			tooltip: 'مقال عن شركة أو منظمة لا يؤكد أهمية أو أهمية الموضوع',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (موقع ويب أو محتوى ويب)',
			value: 'web',
			tooltip: 'مقال عن موقع ويب أو مدونة أو منتدى عبر الإنترنت أو كوميديا ​​على الويب أو بودكاست أو محتوى ويب مشابه لا يؤكد أهمية أو أهمية موضوعه',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (حيوان فردي)',
			value: 'animal',
			tooltip: 'مقال عن حيوان فردي (مثل حيوان أليف) لا يؤكد أهمية أو أهمية موضوعه',
			hideWhenMultiple: true
		},
		{
			label: 'A7: لا يوجد ما يشير إلى الأهمية (حدث منظم)',
			value: 'event',
			tooltip: 'مقال عن حدث منظم (جولة ، وظيفة ، اجتماع ، حفلة ، إلخ) لا يؤكد أهمية أو أهمية موضوعه',
			hideWhenMultiple: true
		},
		{
			label: 'A9: تسجيل موسيقي غير ملحوظ حيث لا توجد مقالة الفنان',
			value: 'a9',
			tooltip: 'مقال عن تسجيل موسيقي لا يشير إلى سبب أهمية موضوعه أو أهميته ، وحيث لم تكن مقالة الفنان موجودة مطلقًا أو تم حذفها'
		},
		{
			label: 'A10: مقالة تم إنشاؤها مؤخرًا وتكرر موضوعًا موجودًا',
			value: 'a10',
			tooltip: 'مقال تم إنشاؤه مؤخرًا بدون سجل صفحة ذي صلة لا يهدف إلى التوسع أو التفصيل أو تحسين المعلومات داخل أي مقال (مقالات) موجودة حول الموضوع ، وحيث لا يمثل العنوان إعادة توجيه معقولة. لا يتضمن ذلك فروع المحتوى أو الصفحات المقسمة أو أي مقال يهدف إلى توسيع أو تفصيل مقال موجود.',
			subgroup: {
				name: 'a10_article',
				type: 'input',
				label: 'المقال الذي تم تكراره:'
			}
		},
		{
			label: 'A11: تم اختراعه بوضوح من قبل المنشئ ، ولا يوجد ادعاء بالأهمية',
			value: 'madeup',
			tooltip: 'مقال يشير بوضوح إلى أن الموضوع تم اختراعه / صياغته / اكتشافه من قبل مُنشئ المقالة أو شخص يعرفونه شخصيًا ، ولا يشير بشكل موثوق إلى سبب أهمية موضوعه أو أهميته'
		}
	];

	Twinkle.speedy.categoryList = [
		{
			label: 'C1: فئات فارغة',
			value: 'catempty',
			tooltip: 'الفئات التي تم إلغاء ملؤها لمدة سبعة أيام على الأقل. لا ينطبق هذا على الفئات التي تتم مناقشتها في WP:CFD وفئات التوضيح وبعض الاستثناءات الأخرى. إذا لم تكن الفئة جديدة نسبيًا ، فمن المحتمل أنها تحتوي على مقالات في وقت سابق ، وهناك حاجة إلى مزيد من التحقيق',
		},
		{
			label: 'C4: فئات الصيانة غير المستخدمة بشكل دائم',
			value: 'c4',
			tooltip: 'فئات الصيانة غير المستخدمة ، مثل فئات الصيانة المؤرخة الفارغة لتواريخ في الماضي ، أو فئات التتبع التي لم يعد القالب يستخدمها بعد إعادة الكتابة ، أو الفئات الفرعية الفارغة من الفئة: دمى ويكيبيديا أو الفئة: دمى ويكيبيديا المشتبه بها. فئات الصيانة الفارغة ليست بالضرورة غير مستخدمة - هذا المعيار مخصص للفئات التي ستكون دائمًا فارغة ، وليست فارغة حاليًا فقط.',
			subgroup: {
				name: 'c4_rationale',
				type: 'input',
				label: 'شرح اختياري:',
				size: 60
			}
		}
	];

	Twinkle.speedy.userList = [
		{
			label: 'U1: طلب المستخدم',
			value: 'userreq',
			tooltip: 'الصفحات الفرعية الشخصية ، بناءً على طلب مستخدميها. في بعض الحالات النادرة ، قد تكون هناك حاجة إدارية للاحتفاظ بالصفحة. أيضًا ، في بعض الأحيان ، قد يتم حذف صفحات المستخدم الرئيسية أيضًا. راجع صفحة مستخدم ويكيبيديا للحصول على الإرشادات والإرشادات الكاملة',
			subgroup: mw.config.get('wgNamespaceNumber') === 3 && !mw.config.get('wgTitle').includes('/') ? {
				name: 'userreq_rationale',
				type: 'input',
				label: 'أساس منطقي إلزامي لشرح سبب حذف صفحة نقاش المستخدم هذه:',
				tooltip: 'يتم حذف صفحات نقاش المستخدمين فقط في ظروف استثنائية للغاية. راجع WP:DELTALK.',
				size: 60
			} : null,
			hideSubgroupWhenMultiple: true
		},
		{
			label: 'U2: مستخدم غير موجود',
			value: 'nouser',
			tooltip: 'صفحات المستخدمين للمستخدمين غير الموجودين (تحقق من Special:Listusers)'
		},
		{
			label: 'U5: مستخدم غير مساهم يسيء استخدام ويكيبيديا كمضيف ويب',
			value: 'notwebhost',
			tooltip: 'صفحات في مساحة المستخدم تتكون من كتابات أو معلومات أو مناقشات أو أنشطة لا ترتبط ارتباطًا وثيقًا بأهداف ويكيبيديا ، حيث لم يقم المالك بإجراء تعديلات قليلة أو معدومة خارج صفحات المستخدم ، باستثناء المسودات المعقولة والصفحات الملتزمة بـ WP:UPYES. ينطبق بغض النظر عن عمر الصفحة المعنية.',
			hideWhenRedirect: true
		},
		{
			label: 'G11: صفحة مستخدم ترويجية تحت اسم مستخدم ترويجي',
			value: 'spamuser',
			tooltip: 'صفحة مستخدم ترويجية ، مع اسم مستخدم يروج أو يشير إلى الانتماء إلى الشيء الذي يتم الترويج له. لاحظ أن مجرد وجود صفحة على شركة أو منتج في مساحة مستخدم ما لا يؤهلها للحذف. إذا كانت صفحة المستخدم غير مرغوب فيها ولكن اسم المستخدم ليس كذلك ، ففكر في وضع علامة عليها باستخدام G11 العادي بدلاً من ذلك.',
			hideWhenMultiple: true,
			hideWhenRedirect: true
		},
		{
			label: 'G13: إرسال مسودة AfC أو مسودة فارغة ، قديمة منذ أكثر من 6 أشهر',
			value: 'afc',
			tooltip: 'أي إرسال AfC مرفوض أو غير مرسل أو مسودة فارغة ، والتي لم يتم تحريرها منذ أكثر من 6 أشهر (باستثناء تعديلات الروبوت).',
			hideWhenMultiple: true,
			hideWhenRedirect: true
		}
	];

	Twinkle.speedy.generalList = [
		{
			label: 'G1: هراء خالص. صفحات تتكون بحتة من نص غير متماسك أو كلام طائش بدون محتوى أو تاريخ ذي معنى.',
			value: 'nonsense',
			tooltip: 'لا يشمل ذلك الكتابة الضعيفة أو الخطب الحزبية أو الملاحظات البذيئة أو التخريب أو المواد الخيالية أو المواد غير الموجودة باللغة الإنجليزية أو المواد المترجمة بشكل سيئ أو النظريات غير المعقولة أو الخدع. باختصار ، إذا كنت تستطيع فهمها ، فلا تنطبق G1.',
			hideInNamespaces: [2] // Not applicable in userspace
		},
		{
			label: 'G2: صفحة اختبار',
			value: 'test',
			tooltip: 'صفحة تم إنشاؤها لاختبار التحرير أو وظائف ويكيبيديا الأخرى. لا يتم تضمين الصفحات الموجودة في نطاق اسم المستخدم ، ولا القوالب الصالحة ولكن غير المستخدمة أو المكررة.',
			hideInNamespaces: [2] // Not applicable in userspace
		},
		{
			label: 'G3: تخريب خالص',
			value: 'vandalism',
			tooltip: 'تخريب عادي خالص (بما في ذلك عمليات إعادة التوجيه المتروكة من تخريب نقل الصفحات)'
		},
		{
			label: 'G3: خدعة صارخة',
			value: 'hoax',
			tooltip: 'خدعة صارخة وواضحة ، تصل إلى حد التخريب',
			hideWhenMultiple: true
		},
		{
			label: 'G4: إعادة إنشاء مادة تم حذفها عبر مناقشة الحذف',
			value: 'repost',
			tooltip: 'نسخة ، بأي عنوان ، لصفحة تم حذفها عبر عملية XfD أو مراجعة الحذف ، بشرط أن تكون النسخة متطابقة إلى حد كبير مع الإصدار المحذوف. لا ينطبق هذا البند على المحتوى الذي تم "تخصيصه للمستخدم" ، أو على المحتوى الذي تم إلغاء حذفه نتيجة لمراجعة الحذف ، أو إذا كانت عمليات الحذف السابقة عبارة عن عمليات حذف مقترحة أو سريعة ، على الرغم من أنه في هذه الحالة الأخيرة ، قد تظل معايير الحذف السريع الأخرى سارية',
			subgroup: {
				name: 'repost_xfd',
				type: 'input',
				label: 'الصفحة التي جرت فيها مناقشة الحذف:',
				tooltip: 'يجب أن تبدأ بـ "Wikipedia:"',
				size: 60
			}
		},
		{
			label: 'G5: تم إنشاؤها بواسطة مستخدم محظور أو محظور',
			value: 'banned',
			tooltip: 'الصفحات التي تم إنشاؤها بواسطة مستخدمين محظورين أو محظورين في انتهاك للحظر أو الحظر المفروض عليهم ، والتي لا تحتوي على تعديلات جوهرية من قبل الآخرين',
			subgroup: {
				name: 'banned_user',
				type: 'input',
				label: 'اسم مستخدم محظور (إذا كان متاحًا):',
				tooltip: 'يجب ألا تبدأ بـ "مستخدم:"'
			}
		},
		{
			label: 'G6: خطأ',
			value: 'error',
			tooltip: 'صفحة تم إنشاؤها بوضوح عن طريق الخطأ ، أو إعادة توجيه متروكة من نقل صفحة تم إنشاؤها بوضوح بعنوان خاطئ.',
			hideWhenMultiple: true
		},
		{
			label: 'G6: نقل',
			value: 'move',
			tooltip: 'إفساح المجال لنقل غير مثير للجدل مثل عكس إعادة التوجيه',
			subgroup: [
				{
					name: 'move_page',
					type: 'input',
					label: 'الصفحة المراد نقلها هنا:'
				},
				{
					name: 'move_reason',
					type: 'input',
					label: 'السبب:',
					size: 60
				}
			],
			hideWhenMultiple: true
		},
		{
			label: 'G6: XfD',
			value: 'xfd',
			tooltip: 'تم إغلاق مناقشة الحذف (في AfD أو FfD أو RfD أو TfD أو CfD أو MfD) على أنها "حذف" ، ولكن الصفحة لم يتم حذفها بالفعل.',
			subgroup: {
				name: 'xfd_fullvotepage',
				type: 'input',
				label: 'الصفحة التي عُقدت فيها مناقشة الحذف:',
				tooltip: 'يجب أن تبدأ بـ "Wikipedia:"',
				size: 40
			},
			hideWhenMultiple: true
		},
		{
			label: 'G6: نقل AfC',
			value: 'afc-move',
			tooltip: 'إفساح المجال لقبول مسودة مقدمة إلى AfC',
			subgroup: {
				name: 'draft_page',
				type: 'input',
				label: 'المسودة المراد نقلها هنا:'
			},
			hideWhenMultiple: true
		},
		{
			label: 'G6: نقل صفحة النسخ واللصق',
			value: 'copypaste',
			tooltip: 'ينطبق هذا فقط على نقل صفحة النسخ واللصق لصفحة أخرى تحتاج إلى حذفها مؤقتًا لإفساح المجال لنقل صفحة نظيفة.',
			subgroup: {
				name: 'copypaste_sourcepage',
				type: 'input',
				label: 'الصفحة الأصلية التي تم نسخها ولصقها هنا:',
				size: 60
			},
			hideWhenMultiple: true
		},
		{
			label: 'G6: التدبير المنزلي والتنظيف غير المثير للجدل',
			value: 'g6',
			tooltip: 'مهام الصيانة الروتينية الأخرى',
			subgroup: {
				name: 'g6_rationale',
				type: 'input',
				label: 'الأساس المنطقي:',
				size: 60
			}
		},
		{
			label: 'G7: يطلب المؤلف حذفها ، أو قام المؤلف بإفراغها',
			value: 'author',
			tooltip: 'أي صفحة يطلب حذفها المؤلف الأصلي بحسن نية ، بشرط أن يكون المحتوى الجوهري الوحيد للصفحة قد تمت إضافته بواسطة مؤلفها. إذا قام المؤلف بإفراغ الصفحة ، فيمكن اعتبار ذلك أيضًا طلب حذف.',
			subgroup: {
				name: 'author_rationale',
				type: 'input',
				label: 'شرح اختياري:',
				tooltip: 'ربما ربط المكان الذي طلب فيه المؤلف هذا الحذف.',
				size: 60
			},
			hideSubgroupWhenSysop: true
		},
		{
			label: 'G8: الصفحات التي تعتمد على صفحة غير موجودة أو محذوفة',
			value: 'g8',
			tooltip: 'مثل صفحات النقاش التي لا تحتوي على صفحة موضوع مقابلة ؛ الصفحات الفرعية التي ليس لها صفحة أصل ؛ صفحات الملفات بدون ملف مطابق ؛ عمليات إعادة التوجيه إلى أهداف غير موجودة ؛ أو الفئات التي تملأها قوالب محذوفة أو مستهدفة. يستثني هذا أي صفحة مفيدة للمشروع ، وعلى وجه الخصوص: مناقشات الحذف غير المسجلة في مكان آخر ، وصفحات المستخدم وصفحات نقاش المستخدم ، وأرشيفات صفحات النقاش ، وعمليات إعادة التوجيه المعقولة التي يمكن تغييرها إلى أهداف صالحة ، وصفحات الملفات أو صفحات النقاش للملفات الموجودة على ويكيميديا ​​كومنز.',
			subgroup: {
				name: 'g8_rationale',
				type: 'input',
				label: 'شرح اختياري:',
				size: 60
			},
			hideSubgroupWhenSysop: true
		},
		{
			label: 'G8: الصفحات الفرعية التي ليس لها صفحة أصل',
			value: 'subpage',
			tooltip: 'يستثني هذا أي صفحة مفيدة للمشروع ، وعلى وجه الخصوص: مناقشات الحذف غير المسجلة في مكان آخر ، وصفحات المستخدم وصفحات نقاش المستخدم ، وأرشيفات صفحات النقاش ، وعمليات إعادة التوجيه المعقولة التي يمكن تغييرها إلى أهداف صالحة ، وصفحات الملفات أو صفحات النقاش للملفات الموجودة على ويكيميديا ​​كومنز.',
			hideWhenMultiple: true,
			hideInNamespaces: [0, 6, 8] // hide in main, file, and mediawiki-spaces
		},
		{
			label: 'G10: صفحة الهجوم',
			value: 'attack',
			tooltip: 'الصفحات التي لا تخدم أي غرض سوى التقليل من شأن موضوعها أو تهديده أو أي كيان آخر (مثل "جون كيو. دو هو معتوه"). ويشمل ذلك سيرة شخصية لشخص حي ذات نبرة سلبية وغير موثقة ، حيث لا يوجد إصدار محايد في السجل للرجوع إليه. يجب على المسؤولين الذين يحذفون هذه الصفحات عدم اقتباس محتوى الصفحة في ملخص الحذف!'
		},
		{
			label: 'G10: BLP سلبي بالكامل وغير مدعوم بمصادر',
			value: 'negublp',
			tooltip: 'سيرة شخصية لشخص حي ذات نبرة سلبية تمامًا وغير موثقة ، حيث لا يوجد إصدار محايد في السجل للرجوع إليه.',
			hideWhenMultiple: true
		},
		{
			label: 'G11: إعلانات أو ترويج لا لبس فيه',
			value: 'spam',
			tooltip: 'الصفحات التي تروج حصريًا لشركة أو منتج أو مجموعة أو خدمة أو شخص والتي تحتاج إلى إعادة كتابتها بشكل أساسي لتصبح موسوعية. لاحظ أن مقالًا عن شركة أو منتج يصف موضوعه من وجهة نظر محايدة لا يفي بهذا المعيار ؛ يجب أن يحتوي مقال الدعاية الصارخ على محتوى غير لائق أيضًا'
		},
		{
			label: 'G12: انتهاك حقوق الطبع والنشر لا لبس فيه',
			value: 'copyvio',
			tooltip: 'إما: (1) تم نسخ المواد من موقع ويب آخر ليس لديه ترخيص متوافق مع ويكيبيديا ، أو أنها عبارة عن صورة فوتوغرافية من بائع صور مخزنة (مثل Getty Images أو Corbis) أو أي موفر محتوى تجاري آخر ؛ (2) لا يوجد محتوى غير منتهك لحقوق الطبع والنشر في سجل الصفحة يستحق الحفظ ؛ أو (3) تم تقديم الانتهاك مرة واحدة من قبل شخص واحد بدلاً من إنشائه بشكل عضوي على wiki ثم نسخه بواسطة موقع ويب آخر مثل أحد نسخ ويكيبيديا العديدة',
			subgroup: [
				{
					name: 'copyvio_url',
					type: 'input',
					label: 'عنوان URL (إذا كان متوفرًا):',
					tooltip: 'إذا تم نسخ المواد من مصدر عبر الإنترنت ، فضع عنوان URL هنا ، بما في ذلك البروتوكول "http://" أو "https://".',
					size: 60
				},
				{
					name: 'copyvio_url2',
					type: 'input',
					label: 'عنوان URL إضافي:',
					tooltip: 'اختياري. يجب أن تبدأ بـ "http://" أو "https://"',
					size: 60
				},
				{
					name: 'copyvio_url3',
					type: 'input',
					label: 'عنوان URL إضافي:',
					tooltip: 'اختياري. يجب أن تبدأ بـ "http://" أو "https://"',
					size: 60
				}
			]
		},
		{
			label: 'G13: صفحة في نطاق اسم المسودة أو إرسال AfC لنطاق اسم المستخدم ، قديمة منذ أكثر من 6 أشهر',
			value: 'afc',
			tooltip: 'أي إرسال AfC مرفوض أو غير مرسل في نطاق اسم المستخدم أو أي صفحة غير إعادة توجيه في نطاق اسم المسودة ، والتي لم يتم تحريرها لأكثر من 6 أشهر. يتم تضمين المسودات الفارغة في أي من مساحتي الاسم أيضًا.',
			hideWhenRedirect: true,
			showInNamespaces: [2, 118] // user, draft namespaces only
		},
		{
			label: 'G14: صفحة توضيح غير ضرورية',
			value: 'disambig',
			tooltip: 'لا ينطبق هذا إلا على صفحات التوضيح اليتيمة التي إما: (1) توضح صفحة ويكيبيديا واحدة موجودة فقط وينتهي عنوانها بـ "(توضيح)" (أي أن هناك موضوعًا أساسيًا) ؛ أو (2) لا توضح أي صفحات ويكيبيديا موجودة (صفر) ، بغض النظر عن عنوانها. وينطبق أيضًا على عمليات إعادة التوجيه "Foo (توضيح)" اليتيمة التي تستهدف الصفحات التي ليست توضيحًا أو صفحات شبيهة بالتوضيح (مثل مقالات فهرس المجموعة أو القوائم)'
		}
	];

	Twinkle.speedy.redirectList = [
		{
			label: 'R2: إعادة توجيه من النطاق الرئيسي إلى أي نطاق آخر باستثناء نطاقات: تصنيف، قالب، ويكيبيديا، مساعدة، وبوابة',
			value: 'rediruser',
			tooltip: 'لا يشمل ذلك اختصارات النطاق الزائف. إذا كان هذا نتيجة لنقل صفحة ، ففكر في الانتظار يومًا أو يومين قبل حذف إعادة التوجيه',
			showInNamespaces: [0]
		},
		{
			label: 'R3: إعادة توجيه تم إنشاؤها مؤخرًا من خطأ مطبعي أو تسمية خاطئة غير معقولة',
			value: 'redirtypo',
			tooltip: 'ومع ذلك ، فإن عمليات إعادة التوجيه من الأخطاء الإملائية الشائعة أو التسميات الخاطئة شائعة الاستخدام بشكل عام ، وكذلك عمليات إعادة التوجيه بلغات أخرى'
		},
		{
			label: 'R4: إعادة توجيه مساحة اسم الملف باسم يطابق صفحة Commons',
			value: 'redircom',
			tooltip: 'يجب ألا تحتوي إعادة التوجيه على أي روابط واردة (ما لم تكن الروابط مخصصة بوضوح للملف أو إعادة التوجيه في Commons).',
			showInNamespaces: [6]
		},
		{
			label: 'G6: إعادة التوجيه إلى صفحة توضيح موضوعة في غير مكانها',
			value: 'movedab',
			tooltip: 'لا ينطبق هذا إلا على عمليات إعادة التوجيه إلى صفحات التوضيح التي تنتهي بـ (توضيح) حيث لا يوجد موضوع أساسي.',
			hideWhenMultiple: true
		},
		{
			label: 'G8: عمليات إعادة التوجيه إلى أهداف غير موجودة',
			value: 'redirnone',
			tooltip: 'يستثني هذا أي صفحة مفيدة للمشروع ، وعلى وجه الخصوص: مناقشات الحذف غير المسجلة في مكان آخر ، وصفحات المستخدم وصفحات نقاش المستخدم ، وأرشيفات صفحات النقاش ، وعمليات إعادة التوجيه المعقولة التي يمكن تغييرها إلى أهداف صالحة ، وصفحات الملفات أو صفحات النقاش للملفات الموجودة على ويكيميديا ​​كومنز.',
			hideWhenMultiple: true
		}
	];

	Twinkle.speedy.normalizeHash = {
		reason: 'db',
		nonsense: 'g1',
		test: 'g2',
		vandalism: 'g3',
		hoax: 'g3',
		repost: 'g4',
		banned: 'g5',
		error: 'g6',
		move: 'g6',
		'afc-move': 'g6',
		xfd: 'g6',
		movedab: 'g6',
		copypaste: 'g6',
		g6: 'g6',
		author: 'g7',
		g8: 'g8',
		talk: 'g8',
		subpage: 'g8',
		redirnone: 'g8',
		imagepage: 'g8',
		attack: 'g10',
		negublp: 'g10',
		spam: 'g11',
		spamuser: 'g11',
		copyvio: 'g12',
		afc: 'g13',
		disambig: 'g14',
		nocontext: 'a1',
		foreign: 'a2',
		nocontent: 'a3',
		a7: 'a7',
		person: 'a7',
		corp: 'a7',
		web: 'a7',
		band: 'a7',
		club: 'a7',
		animal: 'a7',
		event: 'a7',
		a9: 'a9',
		a10: 'a10',
		madeup: 'a11',
		rediruser: 'r2',
		redirtypo: 'r3',
		redircom: 'r4',
		redundantimage: 'f1',
		noimage: 'f2',
		fpcfail: 'f2',
		noncom: 'f3',
		unksource: 'f4',
		unfree: 'f5',
		f5: 'f5',
		norat: 'f6',
		badfairuse: 'f7',
		commons: 'f8',
		imgcopyvio: 'f9',
		nopermission: 'f11',
		catempty: 'c1',
		c4: 'c4',
		userreq: 'u1',
		nouser: 'u2',
		notwebhost: 'u5'
	};

	Twinkle.speedy.callbacks = {
		getTemplateCodeAndParams: function (params) {
			let code, parameters, i;
			if (params.normalizeds.length > 1) {
				code = '{{db-multiple';
				params.utparams = {};
				$.each(params.normalizeds, (index, norm) => {
					code += '|' + norm.toUpperCase();
					parameters = params.templateParams[index] || [];
					for (const i in parameters) {
						if (typeof parameters[i] === 'string' && !parseInt(i, 10)) { // skip numeric parameters - {{db-multiple}} doesn't understand them
							code += '|' + i + '=' + parameters[i];
						}
					}
					$.extend(params.utparams, Twinkle.speedy.getUserTalkParameters(norm, parameters));
				});
				code += '}}';
			} else {
				parameters = params.templateParams[0] || [];
				code = '{{db-' + params.values[0];
				for (i in parameters) {
					if (typeof parameters[i] === 'string') {
						code += '|' + i + '=' + parameters[i];
					}
				}
				if (params.usertalk) {
					code += '|help=off';
				}
				code += '}}';
				params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
			}

			return [code, params.utparams];
		},

		parseWikitext: function (wikitext, callback) {
			const query = {
				action: 'parse',
				prop: 'text',
				pst: 'true',
				text: wikitext,
				contentmodel: 'wikitext',
				title: mw.config.get('wgPageName'),
				disablelimitreport: true,
				format: 'json'
			};

			const statusIndicator = new Morebits.Status('جارٍ إنشاء ملخص الحذف');
			const api = new Morebits.wiki.Api('تحليل قالب الحذف', query, ((apiobj) => {
				const reason = decodeURIComponent($(apiobj.getResponse().parse.text).find('#delete-reason').text()).replace(/\+/g, ' ');
				if (!reason) {
					statusIndicator.warn('تعذر إنشاء ملخص من قالب الحذف');
				} else {
					statusIndicator.info('اكتمل');
				}
				callback(reason);
			}), statusIndicator);
			api.post();
		},

		noteToCreator: function (pageobj) {
			const params = pageobj.getCallbackParameters();
			let initialContrib = pageobj.getCreator();

			// disallow notifying yourself
			if (initialContrib === mw.config.get('wgUserName')) {
				Morebits.Status.warn('أنت (' + initialContrib + ') أنشأت هذه الصفحة. تخطي إشعار المستخدم');
				initialContrib = null;

				// don't notify users when their user talk page is nominated/deleted
			} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
				Morebits.Status.warn('إخطار المساهم الأولي: قام هذا المستخدم بإنشاء صفحة نقاش المستخدم الخاصة به. تخطي الإخطار');
				initialContrib = null;

				// quick hack to prevent excessive unwanted notifications, per request. Should actually be configurable on recipient page...
			} else if ((initialContrib === 'Cyberbot I' || initialContrib === 'SoxBot') && params.normalizeds[0] === 'f2') {
				Morebits.Status.warn('إخطار المساهم الأولي: تم إنشاء الصفحة إجرائيًا بواسطة الروبوت. تخطي الإخطار');
				initialContrib = null;

				// Check for already existing tags
			} else if (Twinkle.speedy.hasCSD && params.warnUser && !confirm('تحتوي الصفحة على علامة متعلقة بالحذف ، وبالتالي من المحتمل أن يكون منشئها قد تم إخطاره. هل تريد إخطارهم بهذا الحذف أيضًا؟')) {
				Morebits.Status.info('إخطار المساهم الأولي', 'تم إلغاؤها من قبل المستخدم. تخطي الإخطار.');
				initialContrib = null;
			}

			if (initialContrib) {
				const usertalkpage = new Morebits.wiki.Page('User talk:' + initialContrib, 'إخطار المساهم الأولي (' + initialContrib + ')');
				let notifytext, i, editsummary;

				// special cases: "db" and "db-multiple"
				if (params.normalizeds.length > 1) {
					notifytext = '\n{{subst:db-' + (params.warnUser ? 'deleted' : 'notice') + '-multiple|1=' + Morebits.pageNameNorm;
					let count = 2;
					$.each(params.normalizeds, (index, norm) => {
						notifytext += '|' + count++ + '=' + norm.toUpperCase();
					});
				} else if (params.normalizeds[0] === 'db') {
					notifytext = '\n{{subst:db-reason-' + (params.warnUser ? 'deleted' : 'notice') + '|1=' + Morebits.pageNameNorm;
				} else {
					notifytext = '\n{{subst:db-csd-' + (params.warnUser ? 'deleted' : 'notice') + '-custom|1=';
					if (params.values[0] === 'copypaste') {
						notifytext += params.templateParams[0].sourcepage;
					} else {
						notifytext += Morebits.pageNameNorm;
					}
					notifytext += '|2=' + params.values[0];
				}

				for (i in params.utparams) {
					if (typeof params.utparams[i] === 'string') {
						notifytext += '|' + i + '=' + params.utparams[i];
					}
				}
				notifytext += (params.welcomeuser ? '' : '|nowelcome=yes') + '}} ~~~~';

				editsummary = 'إخطار: حذف سريع' + (params.warnUser ? '' : ' ترشيح');
				if (!params.normalizeds.includes('g10')) { // no article name in summary for G10 taggings
					editsummary += ' من [[:' + Morebits.pageNameNorm + ']].';
				} else {
					editsummary += ' من صفحة هجوم.';
				}

				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary(editsummary);
				usertalkpage.setChangeTags(Twinkle.changeTags);
				usertalkpage.setCreateOption('recreate');
				usertalkpage.setWatchlist(Twinkle.getPref('watchSpeedyUser'));
				usertalkpage.setFollowRedirect(true, false);
				usertalkpage.append(() => {
					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				}, () => {
					// if user could not be notified, log nomination without mentioning that notification was sent
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, null);
					}
				});
			} else if (params.lognomination) {
				// log nomination even if the user notification wasn't sent
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		sysop: {
			main: function (params) {
				let reason;
				if (!params.normalizeds.length && params.normalizeds[0] === 'db') {
					reason = prompt('أدخل ملخص الحذف المراد استخدامه ، والذي سيتم إدخاله في سجل الحذف:', '');
					Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
				} else {
					const code = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params)[0];
					Twinkle.speedy.callbacks.parseWikitext(code, (reason) => {
						if (params.promptForSummary) {
							reason = prompt('أدخل ملخص الحذف المراد استخدامه ، أو اضغط على "موافق" لقبول الملخص الذي تم إنشاؤه تلقائيًا.', reason);
						}
						Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
					});
				}
			},
			deletePage: function (reason, params) {
				const thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'حذف الصفحة');

				if (reason === null) {
					return Morebits.Status.error('طلب السبب', 'تم إلغاء العملية من قبل المستخدم');
				} else if (!reason || !reason.replace(/^\s*/, '').replace(/\s*$/, '')) {
					return Morebits.Status.error('طلب السبب', 'لم يتم تقديم "سبب" الحذف ، أو لم يتمكن Twinkle من حسابه. أُلغي الطلب.');
				}

				const deleteMain = function (callback) {
					thispage.setEditSummary(reason);
					thispage.setChangeTags(Twinkle.changeTags);
					thispage.setWatchlist(params.watch);
					thispage.deletePage(() => {
						thispage.getStatusElement().info('تم');
						typeof callback === 'function' && callback();
						Twinkle.speedy.callbacks.sysop.deleteTalk(params);
					});
				};

				// look up initial contributor. If prompting user for deletion reason, just display a link.
				// Otherwise open the talk page directly
				if (params.warnUser) {
					thispage.setCallbackParameters(params);
					thispage.lookupCreation((pageobj) => {
						deleteMain(() => {
							Twinkle.speedy.callbacks.noteToCreator(pageobj);
						});
					});
				} else {
					deleteMain();
				}
			},
			deleteTalk: function (params) {
				// delete talk page
				if (params.deleteTalkPage &&
					params.normalized !== 'f8' &&
					!document.getElementById('ca-talk').classList.contains('new')) {
					const talkpage = new Morebits.wiki.Page(mw.config.get('wgFormattedNamespaces')[mw.config.get('wgNamespaceNumber') + 1] + ':' + mw.config.get('wgTitle'), 'حذف صفحة النقاش');
					talkpage.setEditSummary('[[WP:CSD#G8|G8]]: صفحة نقاش الصفحة المحذوفة [[' + Morebits.pageNameNorm + ']]');
					talkpage.setChangeTags(Twinkle.changeTags);
					talkpage.deletePage();
					// this is ugly, but because of the architecture of wiki.api, it is needed
					// (otherwise success/failure messages for the previous action would be suppressed)
					window.setTimeout(() => {
						Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
					}, 1800);
				} else {
					Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
				}
			},
			deleteRedirects: function (params) {
				// delete redirects
				if (params.deleteRedirects) {
					const query = {
						action: 'query',
						titles: mw.config.get('wgPageName'),
						prop: 'redirects',
						rdlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
						format: 'json'
					};
					const wikipedia_api = new Morebits.wiki.Api('جارٍ الحصول على قائمة عمليات إعادة التوجيه ...', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
						new Morebits.Status('حذف عمليات إعادة التوجيه'));
					wikipedia_api.params = params;
					wikipedia_api.post();
				}

				// promote Unlink tool
				let $link, $bigtext;
				if (mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f8') {
					$link = $('<a>', {
						href: '#',
						text: 'انقر هنا للانتقال إلى أداة إلغاء الارتباط',
						css: { fontSize: '130%', fontWeight: 'bold' },
						click: function () {
							Morebits.wiki.actionCompleted.redirect = null;
							Twinkle.speedy.dialog.close();
							Twinkle.unlink.callback('إزالة استخدامات و / أو روابط للملف المحذوف ' + Morebits.pageNameNorm);
						}
					});
					$bigtext = $('<span>', {
						text: 'لعزل الروابط الخلفية وإزالة مثيلات استخدام الملف',
						css: { fontSize: '130%', fontWeight: 'bold' }
					});
					Morebits.Status.info($bigtext[0], $link[0]);
				} else if (params.normalized !== 'f8') {
					$link = $('<a>', {
						href: '#',
						text: 'انقر هنا للانتقال إلى أداة إلغاء الارتباط',
						css: { fontSize: '130%', fontWeight: 'bold' },
						click: function () {
							Morebits.wiki.actionCompleted.redirect = null;
							Twinkle.speedy.dialog.close();
							Twinkle.unlink.callback('إزالة الروابط إلى الصفحة المحذوفة ' + Morebits.pageNameNorm);
						}
					});
					$bigtext = $('<span>', {
						text: 'لعزل الروابط الخلفية',
						css: { fontSize: '130%', fontWeight: 'bold' }
					});
					Morebits.Status.info($bigtext[0], $link[0]);
				}
			},
			deleteRedirectsMain: function (apiobj) {
				const response = apiobj.getResponse();
				const snapshot = response.query.pages[0].redirects || [];
				const total = snapshot.length;
				const statusIndicator = apiobj.statelem;

				if (!total) {
					statusIndicator.status('لم يتم العثور على عمليات إعادة توجيه');
					return;
				}

				statusIndicator.status('0٪');

				let current = 0;
				const onsuccess = function (apiobjInner) {
					const now = parseInt(100 * ++current / total, 10) + '%';
					statusIndicator.update(now);
					apiobjInner.statelem.unlink();
					if (current >= total) {
						statusIndicator.info(now + ' (اكتمل)');
						Morebits.wiki.removeCheckpoint();
					}
				};

				Morebits.wiki.addCheckpoint();

				snapshot.forEach((value) => {
					const title = value.title;
					const page = new Morebits.wiki.Page(title, 'حذف إعادة التوجيه "' + title + '"');
					page.setEditSummary('[[WP:CSD#G8|G8]]: إعادة توجيه إلى الصفحة المحذوفة [[' + Morebits.pageNameNorm + ']]');
					page.setChangeTags(Twinkle.changeTags);
					page.deletePage(onsuccess);
				});
			}
		},

		user: {
			main: function (pageobj) {
				const statelem = pageobj.getStatusElement();

				if (!pageobj.exists()) {
					statelem.error("يبدو أن الصفحة غير موجودة. ربما تم حذفها بالفعل");
					return;
				}

				const params = pageobj.getCallbackParameters();

				// given the params, builds the template and also adds the user talk page parameters to the params that were passed in
				// returns => [<string> wikitext, <object> utparams]
				const buildData = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params);
				let code = buildData[0];
				params.utparams = buildData[1];

				// Set the correct value for |ts= parameter in {{db-g13}}
				if (params.normalizeds.includes('g13')) {
					code = code.replace('$TIMESTAMP', pageobj.getLastEditTime());
				}

				// Tag if possible, post on talk if not
				if (pageobj.canEdit() && ['wikitext', 'Scribunto', 'javascript', 'css', 'sanitized-css'].includes(pageobj.getContentModel()) && mw.config.get('wgNamespaceNumber') !== 710 /* TimedText */) {
					let text = pageobj.getPageText();

					statelem.status('جارٍ التحقق من وجود علامات على الصفحة...');

					// check for existing deletion tags
					const tag = /(?:\{\{\s*(db|delete|db-.*?|speedy deletion-.*?)(?:\s*\||\s*\}\}))/.exec(text);
					// This won't make use of the db-multiple template but it probably should
					if (tag && !confirm('تحتوي الصفحة بالفعل على القالب المرتبط بـ CSD {{' + tag[1] + '}}. هل تريد إضافة قالب CSD آخر؟')) {
						return;
					}

					const xfd = /\{\{((?:article for deletion|proposed deletion|prod blp|template for discussion)\/dated|[cfm]fd\b)/i.exec(text) || /#invoke:(RfD)/.exec(text);
					if (xfd && !confirm('تم العثور على القالب المتعلق بالحذف {{' + xfd[1] + '}} على الصفحة. هل ما زلت تريد إضافة قالب CSD؟')) {
						return;
					}

					// curate/patrol the page
					if (Twinkle.getPref('markSpeedyPagesAsPatrolled')) {
						pageobj.triage();
					}

					// Wrap SD template in noinclude tags if we are in template space.
					// Won't work with userboxes in userspace, or any other transcluded page outside template space
					if (mw.config.get('wgNamespaceNumber') === 10) { // Template:
						code = '<noinclude>' + code + '</noinclude>';
					}

					// Remove tags that become superfluous with this action
					text = text.replace(/\{\{\s*([Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
					if (mw.config.get('wgNamespaceNumber') === 6) {
						// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
						text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
					}

					if (params.requestsalt) {
						if (!params.normalizeds.includes('g10')) {
							code += '\n{{salt}}';
						} else {
							code = '{{salt}}\n' + code;
						}
					}

					if (mw.config.get('wgPageContentModel') === 'Scribunto') {
						// Scribunto isn't parsed like wikitext, so CSD templates on modules need special handling to work
						let equals = '';
						while (code.includes(']' + equals + ']')) {
							equals += '=';
						}
						code = "require('Module:Module wikitext')._addText([" + equals + '[' + code + ']' + equals + ']);';
					} else if (['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'))) {
						// Likewise for JS/CSS pages
						code = '/* ' + code + ' */';
					}

					// Generate edit summary for edit
					let editsummary;
					if (params.normalizeds.length > 1) {
						editsummary = 'طلب حذف سريع (';
						$.each(params.normalizeds, (index, norm) => {
							editsummary += '[[WP:CSD#' + norm.toUpperCase() + '|CSD ' + norm.toUpperCase() + ']], ';
						});
						editsummary = editsummary.substr(0, editsummary.length - 2); // remove trailing comma
						editsummary += ').';
					} else if (params.normalizeds[0] === 'db') {
						editsummary = 'طلب [[WP:CSD|حذف سريع]] مع الأساس المنطقي "' + params.templateParams[0]['1'] + '".';
					} else {
						editsummary = 'طلب حذف سريع ([[WP:CSD#' + params.normalizeds[0].toUpperCase() + '|CSD ' + params.normalizeds[0].toUpperCase() + ']]).';
					}

					// Blank attack pages
					if (params.normalizeds.includes('g10')) {
						text = code;
					} else {
						// Insert tag after short description or any hatnotes
						const wikipage = new Morebits.wikitext.Page(text);
						text = wikipage.insertAfterTemplates(code + '\n', Twinkle.hatnoteRegex).getText();
					}

					pageobj.setPageText(text);
					pageobj.setEditSummary(editsummary);
					pageobj.setWatchlist(params.watch);
					pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
				} else { // Attempt to place on talk page
					const talkName = new mw.Title(pageobj.getPageName()).getTalkPage().toText();
					if (talkName !== pageobj.getPageName()) {
						if (params.requestsalt) {
							code += '\n{{salt}}';
						}

						pageobj.getStatusElement().warn('تعذر تحرير الصفحة ، ووضع العلامة على صفحة النقاش');

						const talk_page = new Morebits.wiki.Page(talkName, 'وضع العلامة تلقائيًا على صفحة النقاش');
						talk_page.setNewSectionTitle(pageobj.getPageName() + ' تم ترشيحه لـ CSD ، طلب حذف');
						talk_page.setNewSectionText(code + '\n\nلم أتمكن من وضع علامة على ' + pageobj.getPageName() + ' لذا يرجى حذفها. ~~~~');
						talk_page.setCreateOption('recreate');
						talk_page.setFollowRedirect(true);
						talk_page.setWatchlist(params.watch);
						talk_page.setChangeTags(Twinkle.changeTags);
						talk_page.setCallbackParameters(params);
						talk_page.newSection(Twinkle.speedy.callbacks.user.tagComplete);
					} else {
						pageobj.getStatusElement().error('لا يمكن تحرير الصفحة ولا يوجد موقع آخر لتقديم طلب حذف سريع ، أُلغي الطلب');
					}
				}
			},

			tagComplete: function (pageobj) {
				const params = pageobj.getCallbackParameters();

				// Notification to first contributor, will also log nomination to the user's userspace log
				if (params.usertalk) {
					const thispage = new Morebits.wiki.Page(Morebits.pageNameNorm);
					thispage.setCallbackParameters(params);
					thispage.lookupCreation(Twinkle.speedy.callbacks.noteToCreator);
					// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
				} else if (params.lognomination) {
					Twinkle.speedy.callbacks.user.addToLog(params, null);
				}
			},

			addToLog: function (params, initialContrib) {
				const usl = new Morebits.UserspaceLogger(Twinkle.getPref('speedyLogPageName'));
				usl.initialText =
					"هذا سجل لجميع ترشيحات [[WP:CSD|الحذف السريع]] التي قام بها هذا المستخدم باستخدام وحدة CSD الخاصة بـ [[WP:TW|Twinkle]].\n\n" +
					'إذا لم تعد ترغب في الاحتفاظ بهذا السجل ، يمكنك إيقاف تشغيله باستخدام [[Wikipedia:Twinkle/Preferences|لوحة التفضيلات]] ، و' +
					'ترشيح هذه الصفحة للحذف السريع بموجب [[WP:CSD#U1|CSD U1]].' +
					(Morebits.userIsSysop ? '\n\nلا يتتبع هذا السجل عمليات الحذف السريع الصريح التي تتم باستخدام Twinkle.' : '');

				const formatParamLog = function (normalize, csdparam, input) {
					if ((normalize === 'G4' && csdparam === 'xfd') ||
						(normalize === 'G6' && csdparam === 'page') ||
						(normalize === 'G6' && csdparam === 'fullvotepage') ||
						(normalize === 'G6' && csdparam === 'sourcepage') ||
						(normalize === 'A2' && csdparam === 'source') ||
						(normalize === 'A10' && csdparam === 'article') ||
						(normalize === 'F1' && csdparam === 'filename')) {
						input = '[[:' + input + ']]';
					} else if (normalize === 'G5' && csdparam === 'user') {
						input = '[[:User:' + input + ']]';
					} else if (normalize === 'G12' && csdparam.lastIndexOf('url', 0) === 0 && input.lastIndexOf('http', 0) === 0) {
						input = '[' + input + ' ' + input + ']';
					} else if (normalize === 'F8' && csdparam === 'filename') {
						input = '[[commons:' + input + ']]';
					}
					return ' {' + normalize + ' ' + csdparam + ': ' + input + '}';
				};

				let extraInfo = '';

				// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
				const fileLogLink = mw.config.get('wgNamespaceNumber') === 6 ? ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} سجل])' : '';

				let editsummary = 'تسجيل ترشيح الحذف السريع';
				let appendText = '# [[:' + Morebits.pageNameNorm;

				if (!params.normalizeds.includes('g10')) { // no article name in log for G10 taggings
					appendText += ']]' + fileLogLink + ': ';
					editsummary += ' من [[:' + Morebits.pageNameNorm + ']].';
				} else {
					appendText += '|هذه]] صفحة هجوم' + fileLogLink + ': ';
					editsummary += ' من صفحة هجوم.';
				}
				if (params.normalizeds.length > 1) {
					appendText += 'معايير متعددة (';
					$.each(params.normalizeds, (index, norm) => {
						appendText += '[[WP:CSD#' + norm.toUpperCase() + '|' + norm.toUpperCase() + ']], ';
					});
					appendText = appendText.substr(0, appendText.length - 2); // remove trailing comma
					appendText += ')';
				} else if (params.normalizeds[0] === 'db') {
					appendText += '{{tl|db-reason}}';
				} else {
					appendText += '[[WP:CSD#' + params.normalizeds[0].toUpperCase() + '|CSD ' + params.normalizeds[0].toUpperCase() + ']] ({{tl|db-' + params.values[0] + '}})';
				}

				// If params is "empty" it will still be full of empty arrays, but ask anyway
				if (params.templateParams) {
					// Treat custom rationale individually
					if (params.normalizeds[0] && params.normalizeds[0] === 'db') {
						extraInfo += formatParamLog('Custom', 'rationale', params.templateParams[0]['1']);
					} else {
						params.templateParams.forEach((item, index) => {
							const keys = Object.keys(item);
							if (keys[0] !== undefined && keys[0].length > 0) {
								// Second loop required since some items (G12, F9) may have multiple keys
								keys.forEach((key, keyIndex) => {
									if (keys[keyIndex] === 'blanked' || keys[keyIndex] === 'ts') {
										return true; // Not worth logging
									}
									extraInfo += formatParamLog(params.normalizeds[index].toUpperCase(), keys[keyIndex], item[key]);
								});
							}
						});
					}
				}

				if (params.requestsalt) {
					appendText += '; طلب حماية الإنشاء ([[WP:SALT|salting]])';
				}
				if (extraInfo) {
					appendText += '; معلومات إضافية:' + extraInfo;
				}
				if (initialContrib) {
					appendText += '; تم إخطار {{user|1=' + initialContrib + '}}';
				}
				appendText += ' ~~~~~\n';

				usl.changeTags = Twinkle.changeTags;
				usl.log(appendText, editsummary);
			}
		}
	};

	// validate subgroups in the form passed into the speedy deletion tag
	Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
		let parameters = [];

		$.each(values, (index, value) => {
			const currentParams = [];
			switch (value) {
				case 'reason':
					if (form['csd.reason_1']) {
						const dbrationale = form['csd.reason_1'].value;
						if (!dbrationale || !dbrationale.trim()) {
							alert('الأساس المنطقي المخصص: الرجاء تحديد أساس منطقي.');
							parameters = null;
							return false;
						}
						currentParams['1'] = dbrationale;
					}
					break;

				case 'userreq': // U1
					if (form['csd.userreq_rationale']) {
						const u1rationale = form['csd.userreq_rationale'].value;
						if (mw.config.get('wgNamespaceNumber') === 3 && !(/\//).test(mw.config.get('wgTitle')) &&
							(!u1rationale || !u1rationale.trim())) {
							alert('CSD U1: الرجاء تحديد أساس منطقي عند ترشيح صفحات نقاش المستخدم.');
							parameters = null;
							return false;
						}
						currentParams.rationale = u1rationale;
					}
					break;

				case 'repost': // G4
					if (form['csd.repost_xfd']) {
						const deldisc = form['csd.repost_xfd'].value;
						if (deldisc) {
							currentParams.xfd = deldisc;
						}
					}
					break;

				case 'banned': // G5
					if (form['csd.banned_user'] && form['csd.banned_user'].value) {
						currentParams.user = form['csd.banned_user'].value.replace(/^\s*User:/i, '');
					}
					break;

				case 'move': // G6
					if (form['csd.move_page'] && form['csd.move_reason']) {
						const movepage = form['csd.move_page'].value,
							movereason = form['csd.move_reason'].value;
						if (!movepage || !movepage.trim()) {
							alert('CSD G6 (نقل): الرجاء تحديد الصفحة المراد نقلها هنا.');
							parameters = null;
							return false;
						}
						if (!movereason || !movereason.trim()) {
							alert('CSD G6 (نقل): الرجاء تحديد سبب النقل.');
							parameters = null;
							return false;
						}
						currentParams.page = movepage;
						currentParams.reason = movereason;
					}
					break;

				case 'xfd': // G6
					if (form['csd.xfd_fullvotepage']) {
						const xfd = form['csd.xfd_fullvotepage'].value;
						if (xfd) {
							currentParams.fullvotepage = xfd;
						}
					}
					break;

				case 'afc-move': // G6
					if (form['csd.draft_page']) {
						const draftpage = form['csd.draft_page'].value;
						if (!draftpage || !draftpage.trim()) {
							alert('CSD G6 (نقل AfC): الرجاء تحديد المسودة المراد نقلها هنا.');
							parameters = null;
							return false;
						}
						currentParams.page = draftpage;
					}
					break;

				case 'copypaste': // G6
					if (form['csd.copypaste_sourcepage']) {
						const copypaste = form['csd.copypaste_sourcepage'].value;
						if (!copypaste || !copypaste.trim()) {
							alert('CSD G6 (نسخ ولصق): الرجاء تحديد اسم الصفحة المصدر.');
							parameters = null;
							return false;
						}
						currentParams.sourcepage = copypaste;
					}
					break;

				case 'g6': // G6
					if (form['csd.g6_rationale'] && form['csd.g6_rationale'].value) {
						currentParams.rationale = form['csd.g6_rationale'].value;
					}
					break;

				case 'author': // G7
					if (form['csd.author_rationale'] && form['csd.author_rationale'].value) {
						currentParams.rationale = form['csd.author_rationale'].value;
					}
					break;

				case 'g8': // G8
					if (form['csd.g8_rationale'] && form['csd.g8_rationale'].value) {
						currentParams.rationale = form['csd.g8_rationale'].value;
					}
					break;

				case 'attack': // G10
					currentParams.blanked = 'yes';
					// it is actually blanked elsewhere in code, but setting the flag here
					break;

				case 'copyvio': // G12
					if (form['csd.copyvio_url'] && form['csd.copyvio_url'].value) {
						currentParams.url = form['csd.copyvio_url'].value;
					}
					if (form['csd.copyvio_url2'] && form['csd.copyvio_url2'].value) {
						currentParams.url2 = form['csd.copyvio_url2'].value;
					}
					if (form['csd.copyvio_url3'] && form['csd.copyvio_url3'].value) {
						currentParams.url3 = form['csd.copyvio_url3'].value;
					}
					break;

				case 'afc': // G13
					currentParams.ts = '$TIMESTAMP'; // to be replaced by the last revision timestamp when page is saved
					break;

				case 'redundantimage': // F1
					if (form['csd.redundantimage_filename']) {
						const redimage = form['csd.redundantimage_filename'].value;
						if (!redimage || !redimage.trim()) {
							alert('CSD F1: الرجاء تحديد اسم ملف الملف الآخر.');
							parameters = null;
							return false;
						}
						currentParams.filename = new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i').test(redimage) ? redimage : 'File:' + redimage;
					}
					break;

				case 'badfairuse': // F7
					if (form['csd.badfairuse_rationale'] && form['csd.badfairuse_rationale'].value) {
						currentParams.rationale = form['csd.badfairuse_rationale'].value;
					}
					break;

				case 'commons': // F8
					if (form['csd.commons_filename']) {
						const filename = form['csd.commons_filename'].value;
						if (filename && filename.trim() && filename !== Morebits.pageNameNorm) {
							currentParams.filename = new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i').test(filename) ? filename : 'File:' + filename;
						}
					}
					break;

				case 'imgcopyvio': // F9
					if (form['csd.imgcopyvio_url'] && form['csd.imgcopyvio_rationale']) {
						const f9url = form['csd.imgcopyvio_url'].value;
						const f9rationale = form['csd.imgcopyvio_rationale'].value;
						if ((!f9url || !f9url.trim()) && (!f9rationale || !f9rationale.trim())) {
							alert('CSD F9: يجب عليك إدخال عنوان url أو سبب (أو كليهما) عند ترشيح ملف بموجب F9.');
							parameters = null;
							return false;
						}
						if (form['csd.imgcopyvio_url'].value) {
							currentParams.url = f9url;
						}
						if (form['csd.imgcopyvio_rationale'].value) {
							currentParams.rationale = f9rationale;
						}
					}
					break;

				case 'foreign': // A2
					if (form['csd.foreign_source']) {
						const foreignlink = form['csd.foreign_source'].value;
						if (!foreignlink || !foreignlink.trim()) {
							alert('CSD A2: الرجاء تحديد ارتباط إنترويكي بالمقال الذي هذه نسخة منه.');
							parameters = null;
							return false;
						}
						currentParams.source = foreignlink;
					}
					break;

				case 'a10': // A10
					if (form['csd.a10_article']) {
						const duptitle = form['csd.a10_article'].value;
						if (!duptitle || !duptitle.trim()) {
							alert('CSD A10: الرجاء تحديد اسم المقال المكرر.');
							parameters = null;
							return false;
						}
						currentParams.article = duptitle;
					}
					break;

				case 'c4': // C4
					if (form['csd.c4_rationale'] && form['csd.c4_rationale'].value) {
						currentParams.rationale = form['csd.c4_rationale'].value;
					}
					break;

				default:
					break;
			}
			parameters.push(currentParams);
		});
		return parameters;
	};

	// Function for processing talk page notification template parameters
	// key1/value1: for {{db-criterion-[notice|deleted]}} (via {{db-csd-[notice|deleted]-custom}})
	// utparams.param: for {{db-[notice|deleted]-multiple}}
	Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
		const utparams = [];

		// Special cases
		if (normalized === 'db') {
			utparams['2'] = parameters['1'];
		} else if (normalized === 'g6') {
			utparams.key1 = 'to';
			utparams.value1 = Morebits.pageNameNorm;
		} else if (normalized === 'g12') {
			['url', 'url2', 'url3'].forEach((item, idx) => {
				if (parameters[item]) {
					idx++;
					utparams['key' + idx] = item;
					utparams['value' + idx] = utparams[item] = parameters[item];
				}
			});
		} else {
			// Handle the rest
			let param;
			switch (normalized) {
				case 'g4':
					param = 'xfd';
					break;
				case 'a2':
					param = 'source';
					break;
				case 'a10':
					param = 'article';
					break;
				case 'f9':
					param = 'url';
					break;
				default:
					break;
			}
			// No harm in providing a usertalk template with the others' parameters
			if (param && parameters[param]) {
				utparams.key1 = param;
				utparams.value1 = utparams[param] = parameters[param];
			}
		}
		return utparams;
	};

	/**
	 * @param {Event} e
	 * @return {Array}
	 */
	Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
		const values = (e.target.form ? e.target.form : e.target).getChecked('csd');
		if (values.length === 0) {
			alert('الرجاء تحديد معيار!');
			return null;
		}
		return values;
	};

	Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
		const form = e.target.form ? e.target.form : e.target;

		if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
			return;
		}

		const tag_only = form.tag_only;
		if (tag_only && tag_only.checked) {
			Twinkle.speedy.callback.evaluateUser(e);
			return;
		}

		const values = Twinkle.speedy.resolveCsdValues(e);
		if (!values) {
			return;
		}
		const templateParams = Twinkle.speedy.getParameters(form, values);
		if (!templateParams) {
			return;
		}

		const normalizeds = values.map((value) => Twinkle.speedy.normalizeHash[value]);

		// analyse each criterion to determine whether to watch the page, prompt for summary, or notify the creator
		let watchPage, promptForSummary;
		normalizeds.forEach((norm) => {
			if (Twinkle.getPref('watchSpeedyPages').includes(norm)) {
				watchPage = Twinkle.getPref('watchSpeedyExpiry');
			}
			if (Twinkle.getPref('promptForSpeedyDeletionSummary').includes(norm)) {
				promptForSummary = true;
			}
		});

		const warnusertalk = form.warnusertalk.checked && normalizeds.some((norm, index) => Twinkle.getPref('warnUserOnSpeedyDelete').includes(norm) &&
			!(norm === 'g6' && values[index] !== 'copypaste'));

		const welcomeuser = warnusertalk && normalizeds.some((norm) => Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').includes(norm));

		const params = {
			values: values,
			normalizeds: normalizeds,
			watch: watchPage,
			deleteTalkPage: form.talkpage && form.talkpage.checked,
			deleteRedirects: form.redirects.checked,
			warnUser: warnusertalk,
			welcomeuser: welcomeuser,
			promptForSummary: promptForSummary,
			templateParams: templateParams
		};

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		Twinkle.speedy.callbacks.sysop.main(params);
	};

	Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
		const form = e.target.form ? e.target.form : e.target;

		if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
			return;
		}

		const values = Twinkle.speedy.resolveCsdValues(e);
		if (!values) {
			return;
		}
		const templateParams = Twinkle.speedy.getParameters(form, values);
		if (!templateParams) {
			return;
		}

		// var multiple = form.multiple.checked;

		const normalizeds = values.map((value) => Twinkle.speedy.normalizeHash[value]);

		// analyse each criterion to determine whether to watch the page/notify the creator
		const watchPage = normalizeds.some((csdCriteria) => Twinkle.getPref('watchSpeedyPages').includes(csdCriteria)) && Twinkle.getPref('watchSpeedyExpiry');

		const notifyuser = form.notify.checked && normalizeds.some((norm, index) => Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').includes(norm) &&
			!(norm === 'g6' && values[index] !== 'copypaste'));
		const welcomeuser = notifyuser && normalizeds.some((norm) => Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').includes(norm));
		const csdlog = Twinkle.getPref('logSpeedyNominations') && normalizeds.some((norm) => !Twinkle.getPref('noLogOnSpeedyNomination').includes(norm));

		const params = {
			values: values,
			normalizeds: normalizeds,
			watch: watchPage,
			usertalk: notifyuser,
			welcomeuser: welcomeuser,
			lognomination: csdlog,
			requestsalt: form.salting.checked,
			templateParams: templateParams
		};

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
		Morebits.wiki.actionCompleted.notice = 'اكتمل الوسم';

		const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وضع علامات على الصفحة');
		wikipedia_page.setChangeTags(Twinkle.changeTags); // Here to apply to triage
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
	};

	Twinkle.addInitCallback(Twinkle.speedy, 'speedy');
}());

// </nowiki>
