// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinklearv.js: ARV module
	 ****************************************
	 * Mode of invocation:     Tab ("ARV")
	 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
	 */

	Twinkle.arv = function twinklearv() {
		const username = mw.config.get('wgRelevantUserName');
		if (!username || username === mw.config.get('wgUserName')) {
			return;
		}

		const isIP = mw.util.isIPAddress(username, true);
		// Ignore ranges wider than the CIDR limit
		if (Morebits.ip.isRange(username) && !Morebits.ip.validCIDR(username)) {
			return;
		}
		const userType = isIP ? 'IP' + (Morebits.ip.isRange(username) ? ' range' : '') : 'user';

		Twinkle.addPortletLink(() => {
			Twinkle.arv.callback(username, isIP);
		}, 'ARV', 'tw-arv', 'الإبلاغ عن ' + userType + ' للمدراء');
	};

	Twinkle.arv.callback = function (uid, isIP) {
		const Window = new Morebits.SimpleWindow(600, 500);
		Window.setTitle('الإبلاغ المتقدم والتدقيق'); // Backronym
		Window.setScriptName('Twinkle');
		Window.addFooterLink('دليل AIV', 'WP:GAIV');
		Window.addFooterLink('دليل UAA', 'WP:UAAI');
		Window.addFooterLink('دليل SPI', 'Wikipedia:Sockpuppet investigations/SPI/Guide to filing cases');
		Window.addFooterLink('تفضيلات ARV', 'WP:TW/PREF#arv');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#arv');
		Window.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(Twinkle.arv.callback.evaluate);
		const categories = form.append({
			type: 'select',
			name: 'category',
			label: 'اختر نوع التقرير:',
			event: Twinkle.arv.callback.changeCategory
		});
		categories.append({
			type: 'option',
			label: 'تخريب (WP:AIV)',
			value: 'aiv'
		});
		categories.append({
			type: 'option',
			label: 'اسم المستخدم (WP:UAA)',
			value: 'username',
			disabled: isIP
		});
		categories.append({
			type: 'option',
			label: 'مدير دمى جورب (WP:SPI)',
			value: 'sock'
		});
		categories.append({
			type: 'option',
			label: 'دمية جورب (WP:SPI)',
			value: 'puppet'
		});
		categories.append({
			type: 'option',
			label: 'حرب التحرير (WP:AN3)',
			value: 'an3',
			disabled: Morebits.ip.isRange(uid) // rvuser template doesn't support ranges
		});
		form.append({
			type: 'div',
			label: '',
			style: 'color: red',
			id: 'twinkle-arv-blockwarning'
		});

		form.append({
			type: 'field',
			label: 'منطقة العمل',
			name: 'work_area'
		});
		form.append({ type: 'submit' });
		form.append({
			type: 'hidden',
			name: 'uid',
			value: uid
		});

		const result = form.render();
		Window.setContent(result);
		Window.display();

		// Check if the user is blocked, update notice
		const query = {
			action: 'query',
			list: 'blocks',
			bkprop: 'range|flags',
			format: 'json'
		};
		if (isIP) {
			query.bkip = uid;
		} else {
			query.bkusers = uid;
		}
		new Morebits.wiki.Api("Checking the user's block status", query, ((apiobj) => {
			const blocklist = apiobj.getResponse().query.blocks;
			if (blocklist.length) {
				// If an IP is blocked *and* rangeblocked, only use whichever is more recent
				const block = blocklist[0];
				let message = (isIP ? 'هذا الـ IP ' + (Morebits.ip.isRange(uid) ? 'نطاق' : 'عنوان') : 'هذا الحساب') + 'هو ' + (block.partial ? 'جزئياً' : 'محظور بالفعل');
				// Start and end differ, range blocked
				message += block.rangestart !== block.rangeend ? ' كجزء من حظر نطاق.' : '.';
				if (block.partial) {
					$('#twinkle-arv-blockwarning').css('color', 'black'); // Less severe
				}
				$('#twinkle-arv-blockwarning').text(message);
			}
		})).post();

		// We must init the
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.category.dispatchEvent(evt);
	};

	Twinkle.arv.callback.changeCategory = function (e) {
		const value = e.target.value;
		const root = e.target.form;
		const old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];
		let work_area = null;

		switch (value) {
			case 'aiv':
			/* falls through */
			default:
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أبلغ عن المستخدم بسبب التخريب',
					name: 'work_area'
				});
				work_area.append({
					type: 'input',
					name: 'page',
					label: 'الصفحة المرتبطة الأساسية:',
					tooltip: 'اترك فارغًا لعدم الارتباط بالصفحة في التقرير',
					value: Twinkle.getPrefill('vanarticle') || '',
					event: function (e) {
						const value = e.target.value;
						const root = e.target.form;
						if (value === '') {
							root.badid.disabled = root.goodid.disabled = true;
						} else {
							root.badid.disabled = false;
							root.goodid.disabled = root.badid.value === '';
						}
					}
				});
				work_area.append({
					type: 'input',
					name: 'badid',
					label: 'معرف المراجعة للصفحة المستهدفة عند التخريب:',
					tooltip: 'اترك فارغًا لعدم وجود رابط diff',
					value: Twinkle.getPrefill('vanarticlerevid') || '',
					disabled: !Twinkle.getPrefill('vanarticle'),
					event: function (e) {
						const value = e.target.value;
						const root = e.target.form;
						root.goodid.disabled = value === '';
					}
				});
				work_area.append({
					type: 'input',
					name: 'goodid',
					label: 'آخر معرف مراجعة جيد قبل تخريب الصفحة المستهدفة:',
					tooltip: 'اترك فارغًا لعدم وجود رابط diff للمراجعة السابقة',
					value: Twinkle.getPrefill('vanarticlegoodrevid') || '',
					disabled: !Twinkle.getPrefill('vanarticle') || Twinkle.getPrefill('vanarticlerevid')
				});
				work_area.append({
					type: 'checkbox',
					name: 'arvtype',
					list: [
						{
							label: 'تخريب بعد التحذير النهائي (المستوى 4 أو 4im)',
							value: 'final'
						},
						{
							label: 'تخريب بعد الإفراج الأخير (خلال يوم واحد) عن الحظر',
							value: 'postblock'
						},
						{
							label: 'من الواضح أنه حساب تخريبي فقط',
							value: 'vandalonly',
							disabled: mw.util.isIPAddress(root.uid.value, true)
						},
						{
							label: 'الحساب هو حساب ترويجي فقط',
							value: 'promoonly',
							disabled: mw.util.isIPAddress(root.uid.value, true)
						},
						{
							label: 'من الواضح أن الحساب هو برنامج روبوت إرسال رسائل غير مرغوب فيها أو حساب مخترق',
							value: 'spambot'
						}
					]
				});
				work_area.append({
					type: 'textarea',
					name: 'reason',
					label: 'تعليق:'
				});
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
			case 'username':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أبلغ عن انتهاك اسم المستخدم',
					name: 'work_area'
				});
				work_area.append({
					type: 'header',
					label: 'نوع (أنواع) اسم المستخدم غير المناسب',
					tooltip: 'لا تسمح ويكيبيديا بأسماء المستخدمين المضللة أو الترويجية أو المسيئة أو المعطلة. وبالمثل ، تحظر أسماء النطاقات وعناوين البريد الإلكتروني. تنطبق هذه المعايير على كل من أسماء المستخدمين والتوقيعات. لا تزال أسماء المستخدمين غير المناسبة بلغة أخرى ، أو التي تمثل اسمًا غير لائق مع أخطاء إملائية واستبدالات ، أو تفعل ذلك بشكل غير مباشر أو ضمنيًا ، تعتبر غير مناسبة.'
				});
				work_area.append({
					type: 'checkbox',
					name: 'arvtype',
					list: [
						{
							label: 'اسم مستخدم مضلل',
							value: 'misleading',
							tooltip: 'تتضمن أسماء المستخدمين المضللة أشياء ذات صلة ومضللة حول المساهم. على سبيل المثال ، نقاط واقعية مضللة ، أو انطباع بسلطة لا مبرر لها ، أو أسماء مستخدمين تعطي انطباعًا عن حساب روبوت.'
						},
						{
							label: 'اسم مستخدم ترويجي',
							value: 'promotional',
							tooltip: 'أسماء المستخدمين الترويجية هي إعلانات لشركة أو موقع ويب أو مجموعة. يرجى عدم الإبلاغ عن هذه الأسماء إلى UAA ما لم يقم المستخدم أيضًا بإجراء تعديلات ترويجية متعلقة بالاسم.'
						},
						{
							label: 'اسم مستخدم مسيء',
							value: 'offensive',
							tooltip: 'أسماء المستخدمين المسيئة تجعل التحرير المتناغم صعبًا أو مستحيلًا.'
						},
						{
							label: 'اسم مستخدم مزعج',
							value: 'disruptive',
							tooltip: 'تتضمن أسماء المستخدمين المعطلة التصيد العلني أو الهجمات الشخصية ، أو تظهر خلاف ذلك نية واضحة لتعطيل ويكيبيديا.'
						}
					]
				});
				work_area.append({
					type: 'textarea',
					name: 'reason',
					label: 'تعليق:'
				});
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;

			case 'puppet':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أبلغ عن دمية جورب مشتبه بها',
					name: 'work_area'
				});
				work_area.append(
					{
						type: 'input',
						name: 'sockmaster',
						label: 'مستخدم دمية جورب',
						tooltip: 'اسم مستخدم مستخدم دمية جورب (sockmaster) بدون البادئة "مستخدم:"'
					}
				);
				work_area.append({
					type: 'textarea',
					label: 'دليل:',
					name: 'evidence',
					tooltip: 'يجب أن يوضح دليلك أن كل مستخدم من هؤلاء من المحتمل أن يسيء استخدام حسابات متعددة. عادةً ما يعني هذا diffs أو سجلات الصفحات أو معلومات أخرى تبرر سبب كون المستخدمين أ) هم نفس الشخص و ب) مدمر. يجب أن يكون هذا مجرد دليل ومعلومات ضرورية للحكم على الأمر. تجنب أي مناقشة أخرى ليست دليلًا على استخدام دمى الجورب.'
				});
				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'طلب CheckUser',
							name: 'checkuser',
							tooltip: 'CheckUser هي أداة تستخدم للحصول على أدلة فنية متعلقة بادعاء باستخدام دمية جورب. لن يتم استخدامه بدون سبب وجيه ، والذي يجب عليك إظهاره بوضوح. تأكد من أن دليلك يشرح سبب استخدام الأداة بشكل مناسب. لن يتم استخدامه لتوصيل حسابات المستخدمين وعناوين IP علنًا.'
						}
					]
				});
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
			case 'sock':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أبلغ عن مستخدم دمية جورب مشتبه به',
					name: 'work_area'
				});
				work_area.append(
					{
						type: 'dyninput',
						name: 'sockpuppets',
						label: 'دمى الجورب',
						sublabel: 'جورب:',
						tooltip: 'اسم مستخدم دمية الجورب بدون البادئة "مستخدم:"',
						min: 2
					});
				work_area.append({
					type: 'textarea',
					label: 'دليل:',
					name: 'evidence',
					tooltip: 'يجب أن يوضح دليلك أن كل مستخدم من هؤلاء من المحتمل أن يسيء استخدام حسابات متعددة. عادةً ما يعني هذا diffs أو سجلات الصفحات أو معلومات أخرى تبرر سبب كون المستخدمين أ) هم نفس الشخص و ب) مدمر. يجب أن يكون هذا مجرد دليل ومعلومات ضرورية للحكم على الأمر. تجنب أي مناقشة أخرى ليست دليلًا على استخدام دمى الجورب.'
				});
				work_area.append({
					type: 'checkbox',
					list: [{
						label: 'طلب CheckUser',
						name: 'checkuser',
						tooltip: 'CheckUser هي أداة تستخدم للحصول على أدلة فنية متعلقة بادعاء باستخدام دمية جورب. لن يتم استخدامه بدون سبب وجيه ، والذي يجب عليك إظهاره بوضوح. تأكد من أن دليلك يشرح سبب استخدام الأداة بشكل مناسب. لن يتم استخدامه لتوصيل حسابات المستخدمين وعناوين IP علنًا.'
					}]
				});
				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
			case 'an3':
				work_area = new Morebits.QuickForm.Element({
					type: 'field',
					label: 'أبلغ عن حرب التحرير',
					name: 'work_area'
				});
				work_area.append({
					type: 'input',
					name: 'page',
					label: 'صفحة',
					tooltip: 'الصفحة التي يتم الإبلاغ عنها'
				});
				work_area.append({
					type: 'button',
					name: 'load',
					label: 'تحميل',
					event: function (e) {
						const root = e.target.form;

						const date = new Morebits.Date().subtract(48, 'hours'); // all since 48 hours

						// Run for each AN3 field
						const getAN3Entries = function (field, rvuser, titles) {
							const $field = $(root).find('[name=' + field + ']');
							$field.find('.entry').remove();

							new mw.Api().get({
								action: 'query',
								prop: 'revisions',
								format: 'json',
								rvprop: 'sha1|ids|timestamp|parsedcomment|comment',
								rvlimit: 500, // intentionally limited
								rvend: date.toISOString(),
								rvuser: rvuser,
								indexpageids: true,
								titles: titles
							}).done((data) => {
								const pageid = data.query.pageids[0];
								const page = data.query.pages[pageid];
								if (!page.revisions) {
									$('<span class="entry">لم يتم العثور على شيء</span>').appendTo($field);
								} else {
									for (let i = 0; i < page.revisions.length; ++i) {
										const rev = page.revisions[i];
										const $entry = $('<div>', {
											class: 'entry'
										});
										const $input = $('<input>', {
											type: 'checkbox',
											name: 's_' + field,
											value: rev.revid
										});
										$input.data('revinfo', rev);
										$input.appendTo($entry);
										let comment = '<span>';
										// revdel/os
										if (typeof rev.commenthidden === 'string') {
											comment += '(التعليق مخفي)';
										} else {
											comment += '"' + rev.parsedcomment + '"';
										}
										comment += ' في <a href="' + mw.config.get('wgScript') + '?diff=' + rev.revid + '">' + new Morebits.Date(rev.timestamp).calendar() + '</a></span>';
										$entry.append(comment).appendTo($field);
									}
								}

								// add free form input for resolves
								if (field === 'resolves') {
									const $free_entry = $('<div>', {
										class: 'entry'
									});
									const $free_input = $('<input>', {
										type: 'text',
										name: 's_resolves_free'
									});

									const $free_label = $('<label>', {
										for: 's_resolves_free',
										html: 'رابط URL لـ diff مع مناقشات إضافية: '
									});
									$free_entry.append($free_label).append($free_input).appendTo($field);
								}
							}).fail(() => {
								$('<span class="entry">فشل API ، أعد تحميل الصفحة وحاول مرة أخرى</span>').appendTo($field);
							});
						};

						// warnings
						const uid = root.uid.value;
						getAN3Entries('warnings', mw.config.get('wgUserName'), 'User talk:' + uid);

						// diffs and resolves require a valid page
						const page = root.page.value;
						if (page) {
							// diffs
							getAN3Entries('diffs', uid, page);

							// resolutions
							const t = new mw.Title(page);
							const talk_page = t.getTalkPage().getPrefixedText();
							getAN3Entries('resolves', mw.config.get('wgUserName'), talk_page);
						} else {
							$(root).find('[name=diffs]').find('.entry').remove();
							$(root).find('[name=resolves]').find('.entry').remove();
						}
					}
				});
				work_area.append({
					type: 'field',
					name: 'diffs',
					label: 'تراجعات المستخدم (خلال الـ 48 ساعة الماضية)',
					tooltip: 'حدد التعديلات التي تعتقد أنها تراجعات'
				});
				work_area.append({
					type: 'field',
					name: 'warnings',
					label: 'تحذيرات موجهة إلى الموضوع',
					tooltip: 'يجب أن تكون قد حذرت الموضوع قبل الإبلاغ'
				});
				work_area.append({
					type: 'field',
					name: 'resolves',
					label: 'مبادرات القرار',
					tooltip: 'يجب أن تكون قد حاولت حل المشكلة في صفحة النقاش أولاً'
				});

				work_area.append({
					type: 'textarea',
					label: 'تعليق:',
					name: 'comment'
				});

				work_area = work_area.render();
				old_area.parentNode.replaceChild(work_area, old_area);
				break;
		}
	};

	Twinkle.arv.callback.evaluate = function (e) {
		const form = e.target;
		let reason = '';
		const input = Morebits.QuickForm.getInputData(form);

		const uid = form.uid.value;

		switch (input.category) {

			// Report user for vandalism
			case 'aiv':
			/* falls through */
			default:
				reason = Twinkle.arv.callback.getAivReasonWikitext(input);

				if (reason === null) {
					alert('يجب عليك تحديد بعض الأسباب');
					return;
				}

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);

				Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Administrator intervention against vandalism';
				Morebits.wiki.actionCompleted.notice = 'اكتمل الإبلاغ';

				var aivPage = new Morebits.wiki.Page('Wikipedia:Administrator intervention against vandalism', 'معالجة طلب AIV');
				aivPage.setPageSection(1);
				aivPage.setFollowRedirect(true);

				aivPage.load(() => {
					const text = aivPage.getPageText();
					const $aivLink = '<a target="_blank" href="/wiki/WP:AIV">WP:AIV</a>';

					// check if user has already been reported
					if (new RegExp('\\{\\{\\s*(?:(?:[Ii][Pp])?[Vv]andal|[Uu]serlinks)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(input.uid) + '\\s*\\}\\}').test(text)) {
						aivPage.getStatusElement().error('التقرير موجود بالفعل ، ولن تتم إضافة تقرير جديد');
						Morebits.Status.printUserText(reason, 'التعليقات التي كتبتها مذكورة أدناه ، في حال كنت ترغب في نشرها يدويًا أسفل التقرير الحالي لهذا المستخدم في ' + $aivLink + ':');
						return;
					}

					// then check for any bot reports
					const tb2Page = new Morebits.wiki.Page('Wikipedia:Administrator intervention against vandalism/TB2', 'جارٍ التحقق من تقارير الروبوت');
					tb2Page.load(() => {
						const tb2Text = tb2Page.getPageText();
						const tb2statelem = tb2Page.getStatusElement();

						if (new RegExp('\\{\\{\\s*(?:(?:[Ii][Pp])?[Vv]andal|[Uu]serlinks)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(input.uid) + '\\s*\\}\\}').test(tb2Text)) {
							if (confirm('المستخدم ' + input.uid + ' تم الإبلاغ عنه بالفعل بواسطة روبوت. هل ترغب في تقديم التقرير على أي حال؟')) {
								tb2statelem.info('تم المتابعة على الرغم من تقرير الروبوت');
							} else {
								tb2statelem.error('تقرير من روبوت موجود بالفعل ، يتم الإيقاف');
								Morebits.Status.printUserText(reason, 'التعليقات التي كتبتها مذكورة أدناه ، في حال كنت ترغب في نشرها يدويًا في ' + $aivLink + ':');
								return;
							}
						} else {
							tb2statelem.info('لا توجد تقارير روبوت متعارضة');
						}

						aivPage.getStatusElement().status('إضافة تقرير جديد...');
						aivPage.setEditSummary('الإبلاغ عن [[Special:Contributions/' + input.uid + '|' + input.uid + ']].');
						aivPage.setChangeTags(Twinkle.changeTags);
						aivPage.setAppendText(Twinkle.arv.callback.buildAivReport(input));
						aivPage.append();
					});
				});
				break;

			// Report inappropriate username
			case 'username':
				var censorUsername = input.arvtype.includes('offensive'); // check if the username is marked offensive

				reason = Twinkle.arv.callback.getUsernameReportWikitext(input);

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);

				Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Usernames for administrator attention';
				Morebits.wiki.actionCompleted.notice = 'اكتمل الإبلاغ';

				var uaaPage = new Morebits.wiki.Page('Wikipedia:Usernames for administrator attention', 'معالجة طلب UAA');
				uaaPage.setFollowRedirect(true);

				uaaPage.load(() => {
					const text = uaaPage.getPageText();

					// check if user has already been reported
					if (new RegExp('\\{\\{\\s*user-uaa\\s*\\|\\s*(1\\s*=\\s*)?' + Morebits.string.escapeRegExp(input.uid) + '\\s*(\\||\\})').test(text)) {
						uaaPage.getStatusElement().error('المستخدم مدرج بالفعل.');
						const $uaaLink = '<a target="_blank" href="/wiki/WP:UAA">WP:UAA</a>';
						Morebits.Status.printUserText(reason, 'التعليقات التي كتبتها مذكورة أدناه ، في حال كنت ترغب في نشرها يدويًا أسفل التقرير الحالي لهذا المستخدم في ' + $uaaLink + ':');
						return;
					}
					uaaPage.getStatusElement().status('إضافة تقرير جديد...');
					uaaPage.setEditSummary('الإبلاغ عن ' + (censorUsername ? 'اسم مستخدم مسيء.' : '[[Special:Contributions/' + input.uid + '|' + input.uid + ']].'));
					uaaPage.setChangeTags(Twinkle.changeTags);

					// Blank newline per [[Special:Permalink/996949310#Spacing]]; see also [[WP:LISTGAP]] and [[WP:INDENTGAP]]
					uaaPage.setPageText(text + '\n' + reason + '\n*');
					uaaPage.save();
				});
				break;

			// WP:SPI
			case 'sock':
			/* falls through */
			case 'puppet':
				var reportData = Twinkle.arv.callback.getSpiReportData(input);

				if (reportData.error) {
					alert(reportData.error);
					return;
				}

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);

				Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

				var reportpage = 'Wikipedia:Sockpuppet investigations/' + reportData.sockmaster;

				Morebits.wiki.actionCompleted.redirect = reportpage;
				Morebits.wiki.actionCompleted.notice = 'اكتمل الإبلاغ';

				var spiPage = new Morebits.wiki.page(reportpage, 'استرداد صفحة المناقشة');
				spiPage.setFollowRedirect(true);
				spiPage.setEditSummary('إضافة تقرير جديد لـ [[Special:Contributions/' + reportData.sockmaster + '|' + reportData.sockmaster + ']].');
				spiPage.setChangeTags(Twinkle.changeTags);
				spiPage.setAppendText(reportData.wikitext);
				spiPage.setWatchlist(Twinkle.getPref('spiWatchReport'));
				spiPage.append();

				Morebits.wiki.removeCheckpoint(); // all page updates have been started
				break;

			case 'an3':
				var diffs = $.map($('input:checkbox[name=s_diffs]:checked', form), (o) => $(o).data('revinfo'));

				if (diffs.length < 3 && !confirm('لقد اخترت أقل من ثلاثة تعديلات مسيئة. هل ترغب في تقديم التقرير على أي حال؟')) {
					return;
				}

				var warnings = $.map($('input:checkbox[name=s_warnings]:checked', form), (o) => $(o).data('revinfo'));

				if (!warnings.length && !confirm('لم تحدد أي تعديلات قمت فيها بتحذير المخالف. هل ترغب في تقديم التقرير على أي حال؟')) {
					return;
				}

				var resolves = $.map($('input:checkbox[name=s_resolves]:checked', form), (o) => $(o).data('revinfo'));
				var free_resolves = $('input[name=s_resolves_free]').val();

				var an3_next = function (free_resolves) {
					if (!resolves.length && !free_resolves && !confirm('لم تحدد أي تعديلات حاولت فيها حل المشكلة. هل ترغب في تقديم التقرير على أي حال؟')) {
						return;
					}

					const an3Parameters = {
						uid: uid,
						page: form.page.value.trim(),
						comment: form.comment.value.trim(),
						diffs: diffs,
						warnings: warnings,
						resolves: resolves,
						free_resolves: free_resolves
					};

					Morebits.SimpleWindow.setButtonsEnabled(false);
					Morebits.Status.init(form);
					Twinkle.arv.processAN3(an3Parameters);
				};

				if (free_resolves) {
					let query;
					let diff, oldid;
					const specialDiff = /Special:Diff\/(\d+)(?:\/(\S+))?/i.exec(free_resolves);
					if (specialDiff) {
						if (specialDiff[2]) {
							oldid = specialDiff[1];
							diff = specialDiff[2];
						} else {
							diff = specialDiff[1];
						}
					} else {
						diff = mw.util.getParamValue('diff', free_resolves);
						oldid = mw.util.getParamValue('oldid', free_resolves);
					}
					const title = mw.util.getParamValue('title', free_resolves);
					const diffNum = /^\d+$/.test(diff); // used repeatedly

					// rvdiffto in prop=revisions is deprecated, but action=compare doesn't return
					// timestamps ([[phab:T247686]]) so we can't rely on it unless necessary.
					// Likewise, we can't rely on a meaningful comment for diff=cur.
					// Additionally, links like Special:Diff/123/next, Special:Diff/123/456, or ?diff=next&oldid=123
					// would each require making use of rvdir=newer in the revisions API.
					// That requires a title parameter, so we have to use compare instead of revisions.
					if (oldid && (diff === 'cur' || (!title && (diff === 'next' || diffNum)))) {
						query = {
							action: 'compare',
							fromrev: oldid,
							prop: 'ids|title',
							format: 'json'
						};
						if (diffNum) {
							query.torev = diff;
						} else {
							query.torelative = diff;
						}
					} else {
						query = {
							action: 'query',
							prop: 'revisions',
							rvprop: 'ids|timestamp|comment',
							format: 'json',
							indexpageids: true
						};

						if (diff && oldid) {
							if (diff === 'prev') {
								query.revids = oldid;
							} else {
								query.titles = title;
								query.rvdir = 'newer';
								query.rvstartid = oldid;

								if (diff === 'next' && title) {
									query.rvlimit = 2;
								} else if (diffNum) {
									// Diffs may or may not be consecutive, no limit
									query.rvendid = diff;
								}
							}
						} else {
							// diff=next|prev|cur with no oldid
							// Implies title= exists otherwise it's not a valid diff link (well, it is, but to the Main Page)
							if (diff && /^\D+$/.test(diff)) {
								query.titles = title;
							} else {
								query.revids = diff || oldid;
							}
						}
					}

					new mw.Api().get(query).done((data) => {
						let page;
						if (data.compare && data.compare.fromtitle === data.compare.totitle) {
							page = data;
						} else if (data.query) {
							const pageid = data.query.pageids[0];
							page = data.query.pages[pageid];
						} else {
							return;
						}
						an3_next(page);
					}).fail((data) => {
						console.log('API failed :(', data); // eslint-disable-line no-console
					});
				} else {
					an3_next();
				}
				break;
		}
	};

	Twinkle.arv.callback.getAivReasonWikitext = function (input) {
		let text = '';
		let type = input.arvtype;

		if (!type.length && input.reason === '') {
			return null;
		}

		type = type.map((v) => {
			switch (v) {
				case 'final':
					return 'تخريب بعد التحذير النهائي';
				case 'postblock':
					return 'تخريب بعد الإفراج الأخير عن الحظر';
				case 'vandalonly':
					return 'تشير الإجراءات بوضوح إلى حساب تخريبي فقط';
				case 'promoonly':
					return 'يستخدم الحساب فقط لأغراض ترويجية';
				case 'spambot':
					return 'من الواضح أن الحساب هو برنامج روبوت إرسال رسائل غير مرغوب فيها أو حساب مخترق';
				default:
					return 'سبب غير معروف';
			}
		}).join('; ');

		if (input.page !== '') {
			// Allow links to redirects, files, and categories
			text = 'في {{No redirect|:' + input.page + '}}';
			if (input.badid !== '') {
				text += ' ({{diff|' + input.page + '|' + input.badid + '|' + input.goodid + '|diff}})';
			}
			text += ':';
		}

		if (type) {
			text += ' ' + type;
		}

		if (input.reason !== '') {
			const textEndsInPunctuationOrBlank = /([.?!;:]|^)$/.test(text);
			text += textEndsInPunctuationOrBlank ? '' : '.';
			const textIsBlank = text === '';
			text += textIsBlank ? '' : ' ';
			text += input.reason;
		}

		text = text.trim();
		const textEndsInPunctuation = /[.?!;]$/.test(text);
		if (!textEndsInPunctuation) {
			text += '.';
		}

		text += ' ~~~~';
		text = text.replace(/\r?\n/g, '\n*:'); // indent newlines

		return text;
	};

	Twinkle.arv.callback.buildAivReport = function (input) {
		return '\n*{{vandal|' + (/=/.test(input.uid) ? '1=' : '') + input.uid + '}} &ndash; ' + Twinkle.arv.callback.getAivReasonWikitext(input);
	};

	Twinkle.arv.callback.getUsernameReportWikitext = function (input) {
		// generate human-readable string, e.g. "misleading and promotional username"
		if (input.arvtype.length <= 2) {
			input.arvtype = input.arvtype.join(' and ');
		} else {
			input.arvtype = [input.arvtype.slice(0, -1).join(', '), input.arvtype.slice(-1)].join(' and ');
		}

		// a or an?
		let adjective = 'a';
		if (/[aeiouwyh]/.test(input.arvtype[0] || '')) { // non 100% correct, but whatever, including 'h' for Cockney
			adjective = 'an';
		}

		let text = '*{{user-uaa|1=' + input.uid + '}} – ';
		if (input.arvtype.length) {
			text += 'انتهاك لسياسة اسم المستخدم كاسم مستخدم ' + adjective + ' ' + input.arvtype + '. ';
		}
		if (input.reason !== '') {
			text += Morebits.string.toUpperCaseFirstChar(input.reason);
			const endsInPeriod = /\.$/.test(input.reason);
			if (!endsInPeriod) {
				text += '.';
			}
			text += ' ';
		}
		text += '~~~~';
		text = text.replace(/\r?\n/g, '\n*:'); // indent newlines

		return text;
	};

	Twinkle.arv.callback.getSpiReportData = function (input) {
		const isPuppetReport = input.category === 'puppet';

		if (!isPuppetReport) {
			input.sockpuppets = input.sockpuppets.filter((sock) => sock !== ''); // ignore empty sockpuppet inputs
		}

		if (isPuppetReport && !input.sockmaster) {
			return { error: 'لم تدخل حساب sockmaster لهذه الدمية. ضع في اعتبارك الإبلاغ عن هذا الحساب كمدير للدمى بدلاً من ذلك.' };
		} else if (!isPuppetReport && input.sockpuppets.length === 0) {
			return { error: 'لم تدخل أي حساب (حسابات) دمية جورب لمدير الدمى هذا. ضع في اعتبارك الإبلاغ عن هذا الحساب كدمية جورب بدلاً من ذلك.' };
		}

		input.sockmaster = input.sockmaster || input.uid;
		input.sockpuppets = isPuppetReport ? [input.uid] : Morebits.array.uniq(input.sockpuppets);

		let text = '\n{{subst:SPI report|' +
			input.sockpuppets.map((sock, index) => (index + 1) + '=' + sock).join('|') + '\n|evidence=' + input.evidence + ' \n';

		if (input.checkuser) {
			text += '|checkuser=yes';
		}
		text += '}}';

		return {
			sockmaster: input.sockmaster,
			wikitext: text
		};
	};

	Twinkle.arv.processAN3 = function (params) {
		// prepare the AN3 report
		let minid;
		for (let i = 0; i < params.diffs.length; ++i) {
			if (params.diffs[i].parentid && (!minid || params.diffs[i].parentid < minid)) {
				minid = params.diffs[i].parentid;
			}
		}

		new mw.Api().get({
			action: 'query',
			prop: 'revisions',
			format: 'json',
			rvprop: 'sha1|ids|timestamp|comment',
			rvlimit: 100, // intentionally limited
			rvstartid: minid,
			rvexcludeuser: params.uid,
			indexpageids: true,
			titles: params.page
		}).done((data) => {
			Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

			// In case an edit summary was revdel'd
			const hasHiddenComment = function (rev) {
				if (!rev.comment && typeof rev.commenthidden === 'string') {
					return '(التعليق مخفي)';
				}
				return '"' + rev.comment + '"';

			};

			let orig;
			if (data.length) {
				const sha1 = data[0].sha1;
				for (let i = 1; i < data.length; ++i) {
					if (data[i].sha1 === sha1) {
						orig = data[i];
						break;
					}
				}

				if (!orig) {
					orig = data[0];
				}
			}

			let origtext = '';
			if (orig) {
				origtext = '{{diff2|' + orig.revid + '|' + orig.timestamp + '}} ' + hasHiddenComment(orig);
			}

			const grouped_diffs = {};

			let parentid, lastid;
			for (let j = 0; j < params.diffs.length; ++j) {
				const cur = params.diffs[j];
				if ((cur.revid && cur.revid !== parentid) || lastid === null) {
					lastid = cur.revid;
					grouped_diffs[lastid] = [];
				}
				parentid = cur.parentid;
				grouped_diffs[lastid].push(cur);
			}

			const difftext = $.map(grouped_diffs, (sub) => {
				let ret = '';
				if (sub.length >= 2) {
					const last = sub[0];
					const first = sub.slice(-1)[0];
					const label = 'تعديلات متتالية تم إجراؤها من ' + new Morebits.Date(first.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) إلى ' + new Morebits.Date(last.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)';
					ret = '# {{diff|oldid=' + first.parentid + '|diff=' + last.revid + '|label=' + label + '}}\n';
				}
				ret += sub.reverse().map((v) => (sub.length >= 2 ? '#' : '') + '# {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');
				return ret;
			}).reverse().join('\n');
			const warningtext = params.warnings.reverse().map((v) => '#  {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');
			let resolvetext = params.resolves.reverse().map((v) => '#  {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');

			if (params.free_resolves) {
				const page = params.free_resolves;
				if (page.compare) {
					resolvetext += '\n#  {{diff|oldid=' + page.compare.fromrevid + '|diff=' + page.compare.torevid + '|label=تعديلات متتالية في ' + page.compare.totitle + '}}';
				} else if (page.revisions) {
					const revCount = page.revisions.length;
					let rev;
					if (revCount < 3) { // diff=prev or next
						rev = revCount === 1 ? page.revisions[0] : page.revisions[1];
						resolvetext += '\n#  {{diff2|' + rev.revid + '|' + new Morebits.Date(rev.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) في ' + page.title + '}} ' + hasHiddenComment(rev);
					} else { // diff and oldid are nonconsecutive
						rev = page.revisions[0];
						const revLatest = page.revisions[revCount - 1];
						const label = 'تعديلات متتالية تم إجراؤها من ' + new Morebits.Date(rev.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) إلى ' + new Morebits.Date(revLatest.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) في ' + page.title;
						resolvetext += '\n# {{diff|oldid=' + rev.revid + '|diff=' + revLatest.revid + '|label=' + label + '}}\n';
					}
				}
			}

			let comment = params.comment.replace(/~*$/g, '').trim();

			if (comment) {
				comment += ' ~~~~';
			}

			const text = '\n\n{{subst:AN3 report|diffs=' + difftext + '|warnings=' + warningtext + '|resolves=' + resolvetext + '|pagename=' + params.page + '|orig=' + origtext + '|comment=' + comment + '|uid=' + params.uid + '}}';

			const reportpage = 'Wikipedia:Administrators\' noticeboard/Edit warring';

			Morebits.wiki.actionCompleted.redirect = reportpage;
			Morebits.wiki.actionCompleted.notice = 'اكتمل الإبلاغ';

			const an3Page = new Morebits.wiki.Page(reportpage, 'استرداد صفحة المناقشة');
			an3Page.setFollowRedirect(true);
			an3Page.setEditSummary('إضافة تقرير جديد لـ [[Special:Contributions/' + params.uid + '|' + params.uid + ']].');
			an3Page.setChangeTags(Twinkle.changeTags);
			an3Page.setAppendText(text);
			an3Page.append();

			// notify user

			const notifyText = '\n\n{{subst:an3-notice|1=' + mw.util.wikiUrlencode(params.uid) + '|auto=1}} ~~~~';

			const talkPage = new Morebits.wiki.Page('User talk:' + params.uid, 'إخطار محارب التحرير');
			talkPage.setFollowRedirect(true);
			talkPage.setEditSummary('إخطار بشأن مناقشة لوحة إعلانات حرب التحرير.');
			talkPage.setChangeTags(Twinkle.changeTags);
			talkPage.setAppendText(notifyText);
			talkPage.append();
			Morebits.wiki.removeCheckpoint(); // all page updates have been started
		}).fail((data) => {
			console.log('فشل API :(', data); // eslint-disable-line no-console
		});
	};

	Twinkle.addInitCallback(Twinkle.arv, 'arv');
}());

// </nowiki>
