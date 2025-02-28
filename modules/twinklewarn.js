// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinklewarn.js: Warn module
	 ****************************************
	 * Mode of invocation:     Tab ("Warn")
	 * Active on:              Any page with relevant user name (userspace, contribs,
	 *                         etc.) (not IP ranges), as well as the rollback success page
	 */
	Twinkle.warn = function twinklewarn() {

		// Users and IPs but not IP ranges
		if (mw.config.exists('wgRelevantUserName') && !Morebits.ip.isRange(mw.config.get('wgRelevantUserName'))) {
			Twinkle.addPortletLink(Twinkle.warn.callback, 'Warn', 'tw-warn', 'تحذير / إخطار المستخدم');
			if (Twinkle.getPref('autoMenuAfterRollback') &&
				mw.config.get('wgNamespaceNumber') === 3 &&
				Twinkle.getPrefill('vanarticle') &&
				!Twinkle.getPrefill('twinklewelcome') &&
				!Twinkle.getPrefill('noautowarn')) {
				Twinkle.warn.callback();
			}
		}

		// Modify URL of talk page on rollback success pages, makes use of a
		// custom message box in [[MediaWiki:Rollback-success]]
		if (mw.config.get('wgAction') === 'rollback') {
			const $vandalTalkLink = $('#mw-rollback-success').find('.mw-usertoollinks a').first();
			if ($vandalTalkLink.length) {
				$vandalTalkLink.css('font-weight', 'bold');
				$vandalTalkLink.wrapInner($('<span>').attr('title', 'إذا كان ذلك مناسبًا، يمكنك استخدام Twinkle لتحذير المستخدم بشأن تعديلاته على هذه الصفحة.'));

				// Can't provide vanarticlerevid as only wgCurRevisionId is provided
				const extraParam = 'vanarticle=' + mw.util.rawurlencode(Morebits.pageNameNorm);
				const href = $vandalTalkLink.attr('href');
				if (!href.includes('?')) {
					$vandalTalkLink.attr('href', href + '?' + extraParam);
				} else {
					$vandalTalkLink.attr('href', href + '&' + extraParam);
				}
			}
		}
	};

	// Used to close window when switching to ARV in autolevel
	Twinkle.warn.dialog = null;

	Twinkle.warn.callback = function twinklewarnCallback() {
		if (mw.config.get('wgRelevantUserName') === mw.config.get('wgUserName') &&
			!confirm('أنت على وشك تحذير نفسك! هل أنت متأكد أنك تريد المتابعة؟')) {
			return;
		}

		Twinkle.warn.dialog = new Morebits.SimpleWindow(600, 440);
		const dialog = Twinkle.warn.dialog;
		dialog.setTitle('تحذير / إخطار المستخدم');
		dialog.setScriptName('Twinkle');
		dialog.addFooterLink('اختيار مستوى التحذير', 'WP:UWUL#Levels');
		dialog.addFooterLink('تفضيلات التحذير', 'WP:TW/PREF#warn');
		dialog.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#warn');
		dialog.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(Twinkle.warn.callback.evaluate);
		const main_select = form.append({
			type: 'field',
			label: 'اختر نوع التحذير / الإشعار المراد إصداره',
			tooltip: 'اختر أولاً مجموعة تحذير رئيسية، ثم التحذير المحدد المراد إصداره.'
		});

		const main_group = main_select.append({
			type: 'select',
			name: 'main_group',
			tooltip: 'يمكنك تخصيص التحديد الافتراضي في تفضيلات Twinkle الخاصة بك',
			event: Twinkle.warn.callback.change_category
		});

		const defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
		main_group.append({ type: 'option', label: 'تحديد المستوى تلقائيًا (1-4)', value: 'autolevel', selected: defaultGroup === 11 });
		main_group.append({ type: 'option', label: '1: ملاحظة عامة', value: 'level1', selected: defaultGroup === 1 });
		main_group.append({ type: 'option', label: '2: تحذير', value: 'level2', selected: defaultGroup === 2 });
		main_group.append({ type: 'option', label: '3: تحذير', value: 'level3', selected: defaultGroup === 3 });
		main_group.append({ type: 'option', label: '4: تحذير نهائي', value: 'level4', selected: defaultGroup === 4 });
		main_group.append({ type: 'option', label: '4im: التحذير الوحيد', value: 'level4im', selected: defaultGroup === 5 });
		if (Twinkle.getPref('combinedSingletMenus')) {
			main_group.append({ type: 'option', label: 'رسائل ذات إصدار واحد', value: 'singlecombined', selected: defaultGroup === 6 || defaultGroup === 7 });
		} else {
			main_group.append({ type: 'option', label: 'إشعارات ذات إصدار واحد', value: 'singlenotice', selected: defaultGroup === 6 });
			main_group.append({ type: 'option', label: 'تحذيرات ذات إصدار واحد', value: 'singlewarn', selected: defaultGroup === 7 });
		}
		if (Twinkle.getPref('customWarningList').length) {
			main_group.append({ type: 'option', label: 'تحذيرات مخصصة', value: 'custom', selected: defaultGroup === 9 });
		}
		main_group.append({ type: 'option', label: 'جميع قوالب التحذير', value: 'kitchensink', selected: defaultGroup === 10 });

		main_select.append({ type: 'select', name: 'sub_group', event: Twinkle.warn.callback.change_subcategory }); // Will be empty to begin with.

		form.append({
			type: 'input',
			name: 'article',
			label: 'الصفحة المرتبطة',
			value: Twinkle.getPrefill('vanarticle') || '',
			tooltip: 'يمكن ربط صفحة داخل الإشعار، ربما لأنها كانت استعادة لتلك الصفحة التي أرسلت هذا الإشعار. اترك فارغًا لعدم ربط أي صفحة.'
		});

		form.append({
			type: 'div',
			label: '',
			style: 'color: red',
			id: 'twinkle-warn-warning-messages'
		});

		const more = form.append({ type: 'field', name: 'reasonGroup', label: 'معلومات التحذير' });
		more.append({ type: 'textarea', label: 'رسالة اختيارية:', name: 'reason', tooltip: 'ربما سبب ، أو أنه يجب إلحاق إشعار أكثر تفصيلاً' });

		const previewlink = document.createElement('a');
		$(previewlink).on('click', () => {
			Twinkle.warn.callbacks.preview(result); // |result| is defined below
		});
		previewlink.style.cursor = 'pointer';
		previewlink.textContent = 'معاينة';
		more.append({ type: 'div', id: 'warningpreview', label: [previewlink] });
		more.append({ type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' });

		more.append({ type: 'submit', label: 'إرسال' });

		var result = form.render();
		dialog.setContent(result);
		dialog.display();
		result.main_group.root = result;
		result.previewer = new Morebits.wiki.Preview($(result).find('div#twinklewarn-previewbox').last()[0]);

		// Potential notices for staleness and missed reverts
		const vanrevid = Twinkle.getPrefill('vanarticlerevid');
		if (vanrevid) {
			let message = '';
			let query = {};

			// If you tried reverting, check if *you* actually reverted
			if (!Twinkle.getPrefill('noautowarn') && Twinkle.getPrefill('vanarticle')) { // Via rollback link
				query = {
					action: 'query',
					titles: Twinkle.getPrefill('vanarticle'),
					prop: 'revisions',
					rvstartid: vanrevid,
					rvlimit: 2,
					rvdir: 'newer',
					rvprop: 'user',
					format: 'json'
				};

				new Morebits.wiki.Api('التحقق مما إذا كنت قد استعدت الصفحة بنجاح', query, ((apiobj) => {
					const rev = apiobj.getResponse().query.pages[0].revisions;
					const revertUser = rev && rev[1].user;
					if (revertUser && revertUser !== mw.config.get('wgUserName')) {
						message += ' قام شخص آخر باستعادة الصفحة وربما قام بالفعل بتحذير المستخدم.';
						$('#twinkle-warn-warning-messages').text('ملاحظة:' + message);
					}
				})).post();
			}

			// Confirm edit wasn't too old for a warning
			const checkStale = function (vantimestamp) {
				const revDate = new Morebits.Date(vantimestamp);
				if (vantimestamp && revDate.isValid()) {
					if (revDate.add(24, 'hours').isBefore(new Date())) {
						message += ' تم إجراء هذا التعديل منذ أكثر من 24 ساعة، لذا قد يكون التحذير قديمًا.';
						$('#twinkle-warn-warning-messages').text('ملاحظة:' + message);
					}
				}
			};

			let vantimestamp = Twinkle.getPrefill('vantimestamp');
			// If from a rollback module-based revert, no API lookup necessary
			if (vantimestamp) {
				checkStale(vantimestamp);
			} else {
				query = {
					action: 'query',
					prop: 'revisions',
					rvprop: 'timestamp',
					revids: vanrevid,
					format: 'json'
				};
				new Morebits.wiki.Api('التقاط الطوابع الزمنية للمراجعة', query, ((apiobj) => {
					const rev = apiobj.getResponse().query.pages[0].revisions;
					vantimestamp = rev && rev[0].timestamp;
					checkStale(vantimestamp);
				})).post();
			}
		}

		// We must init the first choice (General Note);
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.main_group.dispatchEvent(evt);
	};

	// This is all the messages that might be dispatched by the code
	// Each of the individual templates require the following information:
	//   label (required): A short description displayed in the dialog
	//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with "."
	//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
	//   hideLinkedPage (optional): Set to true to hide the "Linked page" text box. Some warning templates do not have a linked article parameter.
	//   hideReason (optional): Set to true to hide the "Optional message" text box. Some warning templates do not have a reason parameter.
	Twinkle.warn.messages = {
		levels: {
			'Common warnings': {
				'uw-vandalism': {
					level1: {
						label: 'تخريب',
						summary: 'ملاحظة عامة: تحرير غير بناء'
					},
					level2: {
						label: 'تخريب',
						summary: 'تحذير: تحرير غير بناء'
					},
					level3: {
						label: 'تخريب',
						summary: 'تحذير: تخريب'
					},
					level4: {
						label: 'تحذير نهائي: تخريب',
						summary: 'تحذير نهائي: تخريب'
					},
					level4im: {
						label: 'تخريب',
						summary: 'التحذير الوحيد: تخريب'
					}
				},
				'uw-disruptive': {
					level1: {
						label: 'تحرير تخريبي',
						summary: 'ملاحظة عامة: تحرير غير بناء'
					},
					level2: {
						label: 'تحرير تخريبي',
						summary: 'تحذير: تحرير غير بناء'
					},
					level3: {
						label: 'تحرير تخريبي',
						summary: 'تحذير: تحرير تخريبي'
					}
				},
				'uw-test': {
					level1: {
						label: 'اختبارات التحرير',
						summary: 'ملاحظة عامة: اختبارات التحرير'
					},
					level2: {
						label: 'اختبارات التحرير',
						summary: 'تحذير: اختبارات التحرير'
					},
					level3: {
						label: 'اختبارات التحرير',
						summary: 'تحذير: اختبارات التحرير'
					}
				},
				'uw-delete': {
					level1: {
						label: 'إزالة المحتوى، والتفريغ',
						summary: 'ملاحظة عامة: إزالة المحتوى، والتفريغ'
					},
					level2: {
						label: 'إزالة المحتوى، والتفريغ',
						summary: 'تحذير: إزالة المحتوى، والتفريغ'
					},
					level3: {
						label: 'إزالة المحتوى، والتفريغ',
						summary: 'تحذير: إزالة المحتوى، والتفريغ'
					},
					level4: {
						label: 'إزالة المحتوى، والتفريغ',
						summary: 'تحذير نهائي: إزالة المحتوى، والتفريغ'
					},
					level4im: {
						label: 'إزالة المحتوى، والتفريغ',
						summary: 'التحذير الوحيد: إزالة المحتوى، والتفريغ'
					}
				},
				'uw-generic': {
					level4: {
						label: 'تحذير عام (لسلسلة القوالب المفقودة المستوى 4)',
						summary: 'إشعار التحذير النهائي'
					}
				}
			},
			'Behavior in articles': {
				'uw-ai': {
					level1: {
						label: 'استخدام نموذج لغة كبير',
						summary: 'ملاحظة عامة: استخدام نموذج لغة كبير'
					},
					level2: {
						label: 'استخدام نموذج لغة كبير',
						summary: 'تحذير: استخدام نموذج لغة كبير'
					},
					level3: {
						label: 'استخدام نموذج لغة كبير',
						summary: 'تحذير: استخدام نموذج لغة كبير'
					},
					level4: {
						label: 'استخدام نموذج لغة كبير',
						summary: 'تحذير نهائي: استخدام نموذج لغة كبير'
					}
				},
				'uw-biog': {
					level1: {
						label: 'إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء',
						summary: 'ملاحظة عامة: إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء'
					},
					level2: {
						label: 'إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء',
						summary: 'تحذير: إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء'
					},
					level3: {
						label: 'إضافة معلومات مثيرة للجدل / تشهيرية غير موثقة حول الأشخاص الأحياء',
						summary: 'تحذير: إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء'
					},
					level4: {
						label: 'إضافة معلومات تشهيرية غير موثقة حول الأشخاص الأحياء',
						summary: 'تحذير نهائي: إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء'
					},
					level4im: {
						label: 'إضافة معلومات تشهيرية غير موثقة حول الأشخاص الأحياء',
						summary: 'التحذير الوحيد: إضافة معلومات مثيرة للجدل غير موثقة حول الأشخاص الأحياء'
					}
				},
				'uw-defamatory': {
					level1: {
						label: 'إضافة محتوى تشهيري',
						summary: 'ملاحظة عامة: إضافة محتوى تشهيري'
					},
					level2: {
						label: 'إضافة محتوى تشهيري',
						summary: 'تحذير: إضافة محتوى تشهيري'
					},
					level3: {
						label: 'إضافة محتوى تشهيري',
						summary: 'تحذير: إضافة محتوى تشهيري'
					},
					level4: {
						label: 'إضافة محتوى تشهيري',
						summary: 'تحذير نهائي: إضافة محتوى تشهيري'
					},
					level4im: {
						label: 'إضافة محتوى تشهيري',
						summary: 'التحذير الوحيد: إضافة محتوى تشهيري'
					}
				},
				'uw-error': {
					level1: {
						label: 'إدخال أخطاء واقعية متعمدة',
						summary: 'ملاحظة عامة: إدخال أخطاء واقعية'
					},
					level2: {
						label: 'إدخال أخطاء واقعية متعمدة',
						summary: 'تحذير: إدخال أخطاء واقعية'
					},
					level3: {
						label: 'إدخال أخطاء واقعية متعمدة',
						summary: 'تحذير: إدخال أخطاء واقعية'
					},
					level4: {
						label: 'إدخال أخطاء واقعية متعمدة',
						summary: 'تحذير نهائي: إدخال أخطاء واقعية'
					}
				},
				'uw-fringe': {
					level1: {
						label: 'إدخال نظريات هامشية',
						summary: 'ملاحظة عامة: إدخال نظريات هامشية'
					},
					level2: {
						label: 'إدخال نظريات هامشية',
						summary: 'تحذير: إدخال نظريات هامشية'
					},
					level3: {
						label: 'إدخال نظريات هامشية',
						summary: 'تحذير: إدخال نظريات هامشية'
					}
				},
				'uw-genre': {
					level1: {
						label: 'تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مراجع',
						summary: 'ملاحظة عامة: تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مراجع'
					},
					level2: {
						label: 'تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مراجع',
						summary: 'تحذير: تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مراجع'
					},
					level3: {
						label: 'تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مرجع',
						summary: 'تحذير: تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مرجع'
					},
					level4: {
						label: 'تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مرجع',
						summary: 'تحذير نهائي: تغييرات متكررة أو جماعية في الأنواع بدون توافق أو مرجع'
					}
				},
				'uw-image': {
					level1: {
						label: 'تخريب متعلق بالصور في المقالات',
						summary: 'ملاحظة عامة: تخريب متعلق بالصور في المقالات'
					},
					level2: {
						label: 'تخريب متعلق بالصور في المقالات',
						summary: 'تحذير: تخريب متعلق بالصور في المقالات'
					},
					level3: {
						label: 'تخريب متعلق بالصور في المقالات',
						summary: 'تحذير: تخريب متعلق بالصور في المقالات'
					},
					level4: {
						label: 'تخريب متعلق بالصور في المقالات',
						summary: 'تحذير نهائي: تخريب متعلق بالصور في المقالات'
					},
					level4im: {
						label: 'تخريب متعلق بالصور',
						summary: 'التحذير الوحيد: تخريب متعلق بالصور'
					}
				},
				'uw-joke': {
					level1: {
						label: 'استخدام فكاهة غير لائقة في المقالات',
						summary: 'ملاحظة عامة: استخدام فكاهة غير لائقة في المقالات'
					},
					level2: {
						label: 'استخدام فكاهة غير لائقة في المقالات',
						summary: 'تحذير: استخدام فكاهة غير لائقة في المقالات'
					},
					level3: {
						label: 'استخدام فكاهة غير لائقة في المقالات',
						summary: 'تحذير: استخدام فكاهة غير لائقة في المقالات'
					},
					level4: {
						label: 'استخدام فكاهة غير لائقة في المقالات',
						summary: 'تحذير نهائي: استخدام فكاهة غير لائقة في المقالات'
					},
					level4im: {
						label: 'استخدام فكاهة غير لائقة',
						summary: 'التحذير الوحيد: استخدام فكاهة غير لائقة'
					}
				},
				'uw-nor': {
					level1: {
						label: 'إضافة بحث أصلي',
						summary: 'ملاحظة عامة: إضافة بحث أصلي'
					},
					level2: {
						label: 'إضافة بحث أصلي',
						summary: 'تحذير: إضافة بحث أصلي'
					},
					level3: {
						label: 'إضافة بحث أصلي',
						summary: 'تحذير: إضافة بحث أصلي'
					},
					level4: {
						label: 'إضافة بحث أصلي',
						summary: 'تحذير نهائي: إضافة بحث أصلي'
					}
				},
				'uw-notcensored': {
					level1: {
						label: 'الرقابة على المواد',
						summary: 'ملاحظة عامة: الرقابة على المواد'
					},
					level2: {
						label: 'الرقابة على المواد',
						summary: 'تحذير: الرقابة على المواد'
					},
					level3: {
						label: 'الرقابة على المواد',
						summary: 'تحذير: الرقابة على المواد'
					}
				},
				'uw-own': {
					level1: {
						label: 'ملكية المقالات',
						summary: 'ملاحظة عامة: ملكية المقالات'
					},
					level2: {
						label: 'ملكية المقالات',
						summary: 'تحذير: ملكية المقالات'
					},
					level3: {
						label: 'ملكية المقالات',
						summary: 'تحذير: ملكية المقالات'
					},
					level4: {
						label: 'ملكية المقالات',
						summary: 'تحذير نهائي: ملكية المقالات'
					},
					level4im: {
						label: 'ملكية المقالات',
						summary: 'التحذير الوحيد: ملكية المقالات'
					}
				},
				'uw-pronouns': {
					level1: {
						label: 'إدخال ضمائر غير صحيحة',
						summary: 'ملاحظة عامة: إدخال ضمائر غير صحيحة'
					},
					level2: {
						label: 'إدخال ضمائر غير صحيحة',
						summary: 'تحذير: إدخال ضمائر غير صحيحة'
					},
					level3: {
						label: 'إدخال ضمائر غير صحيحة',
						summary: 'تحذير: إدخال ضمائر غير صحيحة'
					}
				},
				'uw-subtle': {
					level1: {
						label: 'تخريب دقيق',
						summary: 'ملاحظة عامة: تحرير غير بناء محتمل'
					},
					level2: {
						label: 'تخريب دقيق',
						summary: 'تحذير: تحرير غير بناء محتمل'
					},
					level3: {
						label: 'تخريب دقيق',
						summary: 'تحذير: تخريب دقيق'
					},
					level4: {
						label: 'تخريب دقيق',
						summary: 'تحذير نهائي: تخريب دقيق'
					}
				},
				'uw-talkinarticle': {
					level1: {
						label: 'إضافة تعليق إلى مقالة',
						summary: 'ملاحظة عامة: إضافة تعليق إلى مقالة'
					},
					level2: {
						label: 'إضافة تعليق إلى مقالة',
						summary: 'تحذير: إضافة تعليق إلى مقالة'
					},
					level3: {
						label: 'إضافة تعليق إلى مقالة',
						summary: 'تحذير: إضافة تعليق إلى مقالة'
					}
				},
				'uw-tdel': {
					level1: {
						label: 'إزالة قوالب الصيانة',
						summary: 'ملاحظة عامة: إزالة قوالب الصيانة'
					},
					level2: {
						label: 'إزالة قوالب الصيانة',
						summary: 'تحذير: إزالة قوالب الصيانة'
					},
					level3: {
						label: 'إزالة قوالب الصيانة',
						summary: 'تحذير: إزالة قوالب الصيانة'
					},
					level4: {
						label: 'إزالة قوالب الصيانة',
						summary: 'تحذير نهائي: إزالة قوالب الصيانة'
					}
				},
				'uw-unsourced': {
					level1: {
						label: 'إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح',
						summary: 'ملاحظة عامة: إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح'
					},
					level2: {
						label: 'إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح',
						summary: 'تحذير: إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح'
					},
					level3: {
						label: 'إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح',
						summary: 'تحذير: إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح'
					},
					level4: {
						label: 'إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح',
						summary: 'تحذير نهائي: إضافة مواد غير موثقة أو مستشهد بها بشكل غير صحيح'
					}
				}
			},
			'Promotions and spam': {
				'uw-advert': {
					level1: {
						label: 'استخدام ويكيبيديا للإعلان أو الترويج',
						summary: 'ملاحظة عامة: استخدام ويكيبيديا للإعلان أو الترويج'
					},
					level2: {
						label: 'استخدام ويكيبيديا للإعلان أو الترويج',
						summary: 'تحذير: استخدام ويكيبيديا للإعلان أو الترويج'
					},
					level3: {
						label: 'استخدام ويكيبيديا للإعلان أو الترويج',
						summary: 'تحذير: استخدام ويكيبيديا للإعلان أو الترويج'
					},
					level4: {
						label: 'استخدام ويكيبيديا للإعلان أو الترويج',
						summary: 'تحذير نهائي: استخدام ويكيبيديا للإعلان أو الترويج'
					},
					level4im: {
						label: 'استخدام ويكيبيديا للإعلان أو الترويج',
						summary: 'التحذير الوحيد: استخدام ويكيبيديا للإعلان أو الترويج'
					}
				},
				'uw-npov': {
					level1: {
						label: 'عدم الالتزام بوجهة نظر محايدة',
						summary: 'ملاحظة عامة: عدم الالتزام بوجهة نظر محايدة'
					},
					level2: {
						label: 'عدم الالتزام بوجهة نظر محايدة',
						summary: 'تحذير: عدم الالتزام بوجهة نظر محايدة'
					},
					level3: {
						label: 'عدم الالتزام بوجهة نظر محايدة',
						summary: 'تحذير: عدم الالتزام بوجهة نظر محايدة'
					},
					level4: {
						label: 'عدم الالتزام بوجهة نظر محايدة',
						summary: 'تحذير نهائي: عدم الالتزام بوجهة نظر محايدة'
					}
				},
				'uw-paid': {
					level1: {
						label: 'تحرير مدفوع الأجر دون إفصاح بموجب شروط استخدام ويكيميديا',
						summary: 'ملاحظة عامة: متطلبات الإفصاح عن التحرير مدفوع الأجر بموجب شروط استخدام ويكيميديا'
					},
					level2: {
						label: 'تحرير مدفوع الأجر دون إفصاح بموجب شروط استخدام ويكيميديا',
						summary: 'تحذير: متطلبات الإفصاح عن التحرير مدفوع الأجر بموجب شروط استخدام ويكيميديا'
					},
					level3: {
						label: 'تحرير مدفوع الأجر دون إفصاح بموجب شروط استخدام ويكيميديا',
						summary: 'تحذير: متطلبات الإفصاح عن التحرير مدفوع الأجر بموجب شروط استخدام ويكيميديا'
					},
					level4: {
						label: 'تحرير مدفوع الأجر دون إفصاح بموجب شروط استخدام ويكيميديا',
						summary: 'تحذير نهائي: متطلبات الإفصاح عن التحرير مدفوع الأجر بموجب شروط استخدام ويكيميديا'
					}
				},
				'uw-spam': {
					level1: {
						label: 'إضافة روابط خارجية غير لائقة',
						summary: 'ملاحظة عامة: إضافة روابط خارجية غير لائقة'
					},
					level2: {
						label: 'إضافة روابط غير مرغوب فيها',
						summary: 'تحذير: إضافة روابط غير مرغوب فيها'
					},
					level3: {
						label: 'إضافة روابط غير مرغوب فيها',
						summary: 'تحذير: إضافة روابط غير مرغوب فيها'
					},
					level4: {
						label: 'إضافة روابط غير مرغوب فيها',
						summary: 'تحذير نهائي: إضافة روابط غير مرغوب فيها'
					},
					level4im: {
						label: 'إضافة روابط غير مرغوب فيها',
						summary: 'التحذير الوحيد: إضافة روابط غير مرغوب فيها'
					}
				}
			},
			'Behavior towards other editors': {
				'uw-agf': {
					level1: {
						label: 'عدم افتراض حسن النية',
						summary: 'ملاحظة عامة: عدم افتراض حسن النية'
					},
					level2: {
						label: 'عدم افتراض حسن النية',
						summary: 'تحذير: عدم افتراض حسن النية'
					},
					level3: {
						label: 'عدم افتراض حسن النية',
						summary: 'تحذير: عدم افتراض حسن النية'
					}
				},
				'uw-harass': {
					level1: {
						label: 'مضايقة المستخدمين الآخرين',
						summary: 'ملاحظة عامة: مضايقة المستخدمين الآخرين'
					},
					level2: {
						label: 'مضايقة المستخدمين الآخرين',
						summary: 'تحذير: مضايقة المستخدمين الآخرين'
					},
					level3: {
						label: 'مضايقة المستخدمين الآخرين',
						summary: 'تحذير: مضايقة المستخدمين الآخرين'
					},
					level4: {
						label: 'مضايقة المستخدمين الآخرين',
						summary: 'تحذير نهائي: مضايقة المستخدمين الآخرين'
					},
					level4im: {
						label: 'مضايقة المستخدمين الآخرين',
						summary: 'التحذير الوحيد: مضايقة المستخدمين الآخرين'
					}
				},
				'uw-npa': {
					level1: {
						label: 'هجوم شخصي موجه إلى محرر معين',
						summary: 'ملاحظة عامة: هجوم شخصي موجه إلى محرر معين'
					},
					level2: {
						label: 'هجوم شخصي موجه إلى محرر معين',
						summary: 'تحذير: هجوم شخصي موجه إلى محرر معين'
					},
					level3: {
						label: 'هجوم شخصي موجه إلى محرر معين',
						summary: 'تحذير: هجوم شخصي موجه إلى محرر معين'
					},
					level4: {
						label: 'هجوم شخصي موجه إلى محرر معين',
						summary: 'تحذير نهائي: هجوم شخصي موجه إلى محرر معين'
					},
					level4im: {
						label: 'هجوم شخصي موجه إلى محرر معين',
						summary: 'التحذير الوحيد: هجوم شخصي موجه إلى محرر معين'
					}
				},
				'uw-tempabuse': {
					level1: {
						label: 'استخدام غير لائق لقالب التحذير أو الحظر',
						summary: 'ملاحظة عامة: استخدام غير لائق لقالب التحذير أو الحظر'
					},
					level2: {
						label: 'استخدام غير لائق لقالب التحذير أو الحظر',
						summary: 'تحذير: استخدام غير لائق لقالب التحذير أو الحظر'
					}
				}
			},
			'Removal of deletion tags': {
				'uw-afd': {
					level1: {
						label: 'إزالة قوالب {{afd}}',
						summary: 'ملاحظة عامة: إزالة قوالب {{afd}}'
					},
					level2: {
						label: 'إزالة قوالب {{afd}}',
						summary: 'تحذير: إزالة قوالب {{afd}}'
					},
					level3: {
						label: 'إزالة قوالب {{afd}}',
						summary: 'تحذير: إزالة قوالب {{afd}}'
					},
					level4: {
						label: 'إزالة قوالب {{afd}}',
						summary: 'تحذير نهائي: إزالة قوالب {{afd}}'
					}
				},
				'uw-blpprod': {
					level1: {
						label: 'إزالة قوالب {{blp prod}}',
						summary: 'ملاحظة عامة: إزالة قوالب {{blp prod}}'
					},
					level2: {
						label: 'إزالة قوالب {{blp prod}}',
						summary: 'تحذير: إزالة قوالب {{blp prod}}'
					},
					level3: {
						label: 'إزالة قوالب {{blp prod}}',
						summary: 'تحذير: إزالة قوالب {{blp prod}}'
					},
					level4: {
						label: 'إزالة قوالب {{blp prod}}',
						summary: 'تحذير نهائي: إزالة قوالب {{blp prod}}'
					}
				},
				'uw-idt': {
					level1: {
						label: 'إزالة علامات حذف الملفات',
						summary: 'ملاحظة عامة: إزالة علامات حذف الملفات'
					},
					level2: {
						label: 'إزالة علامات حذف الملفات',
						summary: 'تحذير: إزالة علامات حذف الملفات'
					},
					level3: {
						label: 'إزالة علامات حذف الملفات',
						summary: 'تحذير: إزالة علامات حذف الملفات'
					},
					level4: {
						label: 'إزالة علامات حذف الملفات',
						summary: 'تحذير نهائي: إزالة علامات حذف الملفات'
					}
				},
				'uw-tfd': {
					level1: {
						label: 'إزالة قوالب {{tfd}}',
						summary: 'ملاحظة عامة: إزالة قوالب {{tfd}}'
					},
					level2: {
						label: 'إزالة قوالب {{tfd}}',
						summary: 'تحذير: إزالة قوالب {{tfd}}'
					},
					level3: {
						label: 'إزالة قوالب {{tfd}}',
						summary: 'تحذير: إزالة قوالب {{tfd}}'
					},
					level4: {
						label: 'إزالة قوالب {{tfd}}',
						summary: 'تحذير نهائي: إزالة قوالب {{tfd}}'
					}
				},
				'uw-speedy': {
					level1: {
						label: 'إزالة علامات الحذف السريع',
						summary: 'ملاحظة عامة: إزالة علامات الحذف السريع'
					},
					level2: {
						label: 'إزالة علامات الحذف السريع',
						summary: 'تحذير: إزالة علامات الحذف السريع'
					},
					level3: {
						label: 'إزالة علامات الحذف السريع',
						summary: 'تحذير: إزالة علامات الحذف السريع'
					},
					level4: {
						label: 'إزالة علامات الحذف السريع',
						summary: 'تحذير نهائي: إزالة علامات الحذف السريع'
					}
				}
			},
			Other: {
				'uw-attempt': {
					level1: {
						label: 'تشغيل مرشح التحرير',
						summary: 'ملاحظة عامة: تشغيل مرشح التحرير'
					},
					level2: {
						label: 'تشغيل مرشح التحرير',
						summary: 'تحذير: تشغيل مرشح التحرير'
					},
					level3: {
						label: 'تشغيل مرشح التحرير',
						summary: 'تحذير: تشغيل مرشح التحرير'
					},
					level4: {
						label: 'تشغيل مرشح التحرير',
						summary: 'تحذير نهائي: تشغيل مرشح التحرير'
					},
					level4im: {
						label: 'تشغيل مرشح التحرير',
						summary: 'التحذير الوحيد: تشغيل مرشح التحرير'
					}
				},
				'uw-chat': {
					level1: {
						label: 'استخدام صفحة النقاش كمنتدى',
						summary: 'ملاحظة عامة: استخدام صفحة النقاش كمنتدى'
					},
					level2: {
						label: 'استخدام صفحة النقاش كمنتدى',
						summary: 'تحذير: استخدام صفحة النقاش كمنتدى'
					},
					level3: {
						label: 'استخدام صفحة النقاش كمنتدى',
						summary: 'تحذير: استخدام صفحة النقاش كمنتدى'
					},
					level4: {
						label: 'استخدام صفحة النقاش كمنتدى',
						summary: 'تحذير نهائي: استخدام صفحة النقاش كمنتدى'
					}
				},
				'uw-create': {
					level1: {
						label: 'إنشاء صفحات غير لائقة',
						summary: 'ملاحظة عامة: إنشاء صفحات غير لائقة'
					},
					level2: {
						label: 'إنشاء صفحات غير لائقة',
						summary: 'تحذير: إنشاء صفحات غير لائقة'
					},
					level3: {
						label: 'إنشاء صفحات غير لائقة',
						summary: 'تحذير: إنشاء صفحات غير لائقة'
					},
					level4: {
						label: 'إنشاء صفحات غير لائقة',
						summary: 'تحذير نهائي: إنشاء صفحات غير لائقة'
					},
					level4im: {
						label: 'إنشاء صفحات غير لائقة',
						summary: 'التحذير الوحيد: إنشاء صفحات غير لائقة'
					}
				},
				'uw-fv': {
					level1: {
						label: 'كان للعبارة المضافة مصدر، لكنها لم تتحقق من المحتوى',
						summary: 'ملاحظة عامة: كان للعبارة المضافة مصدر، لكنها لم تتحقق من المحتوى'
					}
				},
				'uw-mislead': {
					level1: {
						label: 'استخدام ملخصات تعديل مضللة',
						summary: 'ملاحظة عامة: استخدام ملخصات تعديل مضللة'
					},
					level2: {
						label: 'استخدام ملخصات تعديل مضللة',
						summary: 'تحذير: استخدام ملخصات تعديل مضللة'
					},
					level3: {
						label: 'استخدام ملخصات تعديل مضللة',
						summary: 'تحذير: استخدام ملخصات تعديل مضللة'
					}
				},
				'uw-mos': {
					level1: {
						label: 'دليل الأسلوب',
						summary: 'ملاحظة عامة: التنسيق والتاريخ واللغة وما إلى ذلك (دليل الأسلوب)'
					},
					level2: {
						label: 'دليل الأسلوب',
						summary: 'تحذير: التنسيق والتاريخ واللغة وما إلى ذلك (دليل الأسلوب)'
					},
					level3: {
						label: 'دليل الأسلوب',
						summary: 'تحذير: التنسيق والتاريخ واللغة وما إلى ذلك (دليل الأسلوب)'
					},
					level4: {
						label: 'دليل الأسلوب',
						summary: 'تحذير نهائي: التنسيق والتاريخ واللغة وما إلى ذلك (دليل الأسلوب)'
					}
				},
				'uw-move': {
					level1: {
						label: 'عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع',
						summary: 'ملاحظة عامة: عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع'
					},
					level2: {
						label: 'عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع',
						summary: 'تحذير: عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع'
					},
					level3: {
						label: 'عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع',
						summary: 'تحذير: عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع'
					},
					level4: {
						label: 'عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع',
						summary: 'تحذير نهائي: عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع'
					},
					level4im: {
						label: 'عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع',
						summary: 'التحذير الوحيد: عمليات نقل الصفحة تتعارض مع اصطلاحات التسمية أو الإجماع'
					}
				},
				'uw-redirect': {
					level1: {
						label: 'إنشاء عمليات إعادة توجيه غير لائقة',
						summary: 'ملاحظة عامة: إنشاء عمليات إعادة توجيه غير لائقة'
					},
					level2: {
						label: 'إنشاء عمليات إعادة توجيه غير لائقة',
						summary: 'تحذير: إنشاء عمليات إعادة توجيه غير لائقة'
					},
					level3: {
						label: 'إنشاء عمليات إعادة توجيه غير لائقة',
						summary: 'تحذير: إنشاء عمليات إعادة توجيه غير لائقة'
					},
					level4: {
						label: 'إنشاء عمليات إعادة توجيه غير لائقة',
						summary: 'تحذير نهائي: إنشاء عمليات إعادة توجيه غير لائقة'
					},
					level4im: {
						label: 'إنشاء عمليات إعادة توجيه غير لائقة',
						summary: 'التحذير الوحيد: إنشاء عمليات إعادة توجيه غير لائقة'
					}
				},
				'uw-tpv': {
					level1: {
						label: "إعادة هيكلة تعليقات صفحة نقاش الآخرين",
						summary: "ملاحظة عامة: إعادة هيكلة تعليقات صفحة نقاش الآخرين"
					},
					level2: {
						label: "إعادة هيكلة تعليقات صفحة نقاش الآخرين",
						summary: "تحذير: إعادة هيكلة تعليقات صفحة نقاش الآخرين"
					},
					level3: {
						label: "إعادة هيكلة تعليقات صفحة نقاش الآخرين",
						summary: "تحذير: إعادة هيكلة تعليقات صفحة نقاش الآخرين"
					},
					level4: {
						label: "إعادة هيكلة تعليقات صفحة نقاش الآخرين",
						summary: "تحذير نهائي: إعادة هيكلة تعليقات صفحة نقاش الآخرين"
					},
					level4im: {
						label: "إعادة هيكلة تعليقات صفحة نقاش الآخرين",
						summary: "التحذير الوحيد: إعادة هيكلة تعليقات صفحة نقاش الآخرين"
					}
				},
				'uw-upload': {
					level1: {
						label: 'تحميل صور غير موسوعية',
						summary: 'ملاحظة عامة: تحميل صور غير موسوعية'
					},
					level2: {
						label: 'تحميل صور غير موسوعية',
						summary: 'تحذير: تحميل صور غير موسوعية'
					},
					level3: {
						label: 'تحميل صور غير موسوعية',
						summary: 'تحذير: تحميل صور غير موسوعية'
					},
					level4: {
						label: 'تحميل صور غير موسوعية',
						summary: 'تحذير نهائي: تحميل صور غير موسوعية'
					},
					level4im: {
						label: 'تحميل صور غير موسوعية',
						summary: 'التحذير الوحيد: تحميل صور غير موسوعية'
					}
				}
			}
		},

		singlenotice: {
			'uw-agf-sock': {
				label: 'استخدام حسابات متعددة (بافتراض حسن النية)',
				summary: 'إشعار: استخدام حسابات متعددة'
			},
			'uw-aiv': {
				label: 'تقرير AIV سيئ',
				summary: 'إشعار: تقرير AIV سيئ'
			},
			'uw-articletodraft': {
				label: 'تم نقل المقالة إلى مساحة المسودة',
				summary: 'إشعار: تم نقل المقالة إلى مساحة المسودة',
				hideReason: true
			},
			'uw-autobiography': {
				label: 'إنشاء سير ذاتية',
				summary: 'إشعار: إنشاء سير ذاتية'
			},
			'uw-badcat': {
				label: 'إضافة فئات غير صحيحة',
				summary: 'إشعار: إضافة فئات غير صحيحة'
			},
			'uw-badlistentry': {
				label: 'إضافة إدخالات غير مناسبة إلى القوائم',
				summary: 'إشعار: إضافة إدخالات غير مناسبة إلى القوائم'
			},
			'uw-bareurl': {
				label: 'إضافة عنوان URL مجرد',
				summary: 'إشعار: إضافة عنوان URL مجرد'
			},
			'uw-bite': {
				label: 'عض القادمين الجدد',
				summary: 'إشعار: عض القادمين الجدد',
				suppressArticleInSummary: true // non-standard (user name, not article), and not necessary
			},
			'uw-blar': {
				label: 'تم تفريغ المقالة وإعادة توجيهها',
				summary: 'إشعار: تم تفريغ المقالة وإعادة توجيهها',
				hideReason: true
			},
			'uw-circular': {
				label: 'استخدام مصادر دائرية',
				summary: 'إشعار: استخدام مصادر دائرية'
			},
			'uw-coi': {
				label: 'تضارب المصالح',
				summary: 'إشعار: تضارب المصالح',
				heading: 'إدارة تضارب المصالح'
			},
			'uw-controversial': {
				label: 'إدخال مواد مثيرة للجدل',
				summary: 'إشعار: إدخال مواد مثيرة للجدل'
			},
			'uw-copying': {
				label: 'نسخ نص إلى صفحة أخرى',
				summary: 'إشعار: نسخ نص إلى صفحة أخرى'
			},
			'uw-crystal': {
				label: 'إضافة معلومات تخمينية أو غير مؤكدة',
				summary: 'إشعار: إضافة معلومات تخمينية أو غير مؤكدة'
			},
			'uw-c&pmove': {
				label: 'نقل القص واللصق',
				summary: 'إشعار: نقل القص واللصق'
			},
			'uw-dab': {
				label: 'تعديل غير صحيح لصفحة توضيح',
				summary: 'إشعار: تعديل غير صحيح لصفحة توضيح'
			},
			'uw-date': {
				label: 'تغيير تنسيقات التاريخ دون داع',
				summary: 'إشعار: تغيير تنسيقات التاريخ دون داع'
			},
			'uw-deadlink': {
				label: 'إزالة المصادر المناسبة التي تحتوي على روابط معطلة',
				summary: 'إشعار: إزالة المصادر المناسبة التي تحتوي على روابط معطلة'
			},
			'uw-displaytitle': {
				label: 'استخدام غير صحيح لـ DISPLAYTITLE',
				summary: 'إشعار: استخدام غير صحيح لـ DISPLAYTITLE'
			},
			'uw-draftfirst': {
				label: 'يجب على المستخدم الصياغة في مساحة المستخدم دون التعرض لخطر الحذف السريع',
				summary: 'إشعار: ضع في اعتبارك صياغة مقالتك في [[Help:Userspace draft|مساحة المستخدم]]'
			},
			'uw-editsummary': {
				label: 'مستخدم جديد لا يستخدم ملخص التعديل',
				summary: 'إشعار: عدم استخدام ملخص التعديل'
			},
			'uw-editsummary2': {
				label: 'مستخدم متمرس لا يستخدم ملخص التعديل',
				summary: 'إشعار: عدم استخدام ملخص التعديل',
				hideLinkedPage: true,
				hideReason: true
			},
			'uw-elinbody': {
				label: 'إضافة روابط خارجية إلى نص المقالة',
				summary: 'إشعار: احتفظ بالروابط الخارجية في أقسام الروابط الخارجية في أسفل المقالة'
			},
			'uw-english': {
				label: 'عدم التواصل باللغة الإنجليزية',
				summary: 'إشعار: عدم التواصل باللغة الإنجليزية'
			},
			'uw-hasty': {
				label: 'إضافة متسرعة لعلامات الحذف السريع',
				summary: 'إشعار: امنح المبدعين وقتًا لتحسين مقالاتهم قبل وضع علامة عليها للحذف'
			},
			'uw-islamhon': {
				label: 'استخدام التكريمات الإسلامية',
				summary: 'إشعار: استخدام التكريمات الإسلامية'
			},
			'uw-italicize': {
				label: 'كتابة الكتب والأفلام والألبومات والمجلات والمسلسلات التلفزيونية وما إلى ذلك بخط مائل داخل المقالات',
				summary: 'إشعار: كتابة الكتب والأفلام والألبومات والمجلات والمسلسلات التلفزيونية وما إلى ذلك بخط مائل داخل المقالات'
			},
			'uw-lang': {
				label: 'تغيير غير ضروري بين الإنجليزية البريطانية والأمريكية',
				summary: 'إشعار: تغيير غير ضروري بين الإنجليزية البريطانية والأمريكية',
				heading: 'اللهجات الوطنية للغة الإنجليزية'
			},
			'uw-linking': {
				label: 'إضافة مفرطة للروابط الحمراء أو الروابط الزرقاء المتكررة',
				summary: 'إشعار: إضافة مفرطة للروابط الحمراء أو الروابط الزرقاء المتكررة'
			},
			'uw-longsd': {
				label: 'إدراج وصف قصير طويل',
				summary: 'إشعار: إدراج وصف قصير طويل'
			},
			'uw-minor': {
				label: 'استخدام غير صحيح لمربع اختيار التعديلات الطفيفة',
				summary: 'إشعار: استخدام غير صحيح لمربع اختيار التعديلات الطفيفة'
			},
			'uw-multiple-accts': {
				label: 'استخدام غير لائق للحسابات البديلة',
				summary: 'إشعار: استخدام غير لائق للحسابات البديلة'
			},
			'uw-notenglish': {
				label: 'إنشاء مقالات غير إنجليزية',
				summary: 'إشعار: إنشاء مقالات غير إنجليزية'
			},
			'uw-notenglishedit': {
				label: 'إضافة محتوى غير إنجليزي إلى المقالات',
				summary: 'إشعار: إضافة محتوى غير إنجليزي إلى المقالات'
			},
			'uw-notvote': {
				label: 'نحن نستخدم الإجماع، وليس التصويت',
				summary: 'إشعار: نحن نستخدم الإجماع، وليس التصويت'
			},
			'uw-plagiarism': {
				label: 'النسخ من مصادر المجال العام دون إسناد',
				summary: 'إشعار: النسخ من مصادر المجال العام دون إسناد'
			},
			'uw-preview': {
				label: 'استخدم زر المعاينة لتجنب الأخطاء',
				summary: 'إشعار: استخدم زر المعاينة لتجنب الأخطاء'
			},
			'uw-redlink': {
				label: 'الإزالة العشوائية للروابط الحمراء',
				summary: 'إشعار: كن حذرًا عند إزالة الروابط الحمراء'
			},
			'uw-refspam': {
				label: 'إضافة استشهادات لبحث نشرته مجموعة صغيرة من الباحثين',
				summary: 'إشعار: إضافة استشهادات لبحث نشرته مجموعة صغيرة من الباحثين',
				hideLinkedPage: true,
				hideReason: true
			},
			'uw-selfrevert': {
				label: 'اختبارات التحرير التي تم الرجوع عنها ذاتيًا',
				summary: 'إشعار: اختبارات التحرير التي تم الرجوع عنها ذاتيًا'
			},
			'uw-socialnetwork': {
				label: 'ويكيبيديا ليست شبكة اجتماعية',
				summary: 'إشعار: ويكيبيديا ليست شبكة اجتماعية'
			},
			'uw-sofixit': {
				label: 'كن جريئًا وقم بإصلاح الأشياء بنفسك',
				summary: 'إشعار: يمكنك أن تكون جريئًا وتقوم بإصلاح الأشياء بنفسك'
			},
			'uw-spoiler': {
				label: 'إضافة تنبيهات المفسدين أو إزالة المفسدين من الأقسام المناسبة',
				summary: "إشعار: لا تحذف أو تضع علامة على 'المفسدين' المحتملين في مقالات ويكيبيديا"
			},
			'uw-talkinarticle': {
				label: 'تحدث في المقالة',
				summary: 'إشعار: تحدث في المقالة'
			},
			'uw-tilde': {
				label: 'عدم توقيع المشاركات',
				summary: 'إشعار: عدم توقيع المشاركات'
			},
			'uw-toppost': {
				label: 'النشر في أعلى صفحات النقاش',
				summary: 'إشعار: النشر في أعلى صفحات النقاش'
			},
			'uw-translation': {
				label: 'إضافة ترجمات بدون إسناد مناسب',
				summary: 'إشعار: مطلوب إسناد عند ترجمة المقالات'
			},
			'uw-unattribcc': {
				label: 'النسخ من مصادر مرخصة بشكل متوافق دون إسناد',
				summary: 'إشعار: النسخ من مصادر مرخصة بشكل متوافق دون إسناد'
			},
			'uw-userspace draft finish': {
				label: 'مسودة مساحة مستخدم قديمة',
				summary: 'إشعار: مسودة مساحة مستخدم قديمة'
			},
			'uw-usertalk': {
				label: 'إساءة استخدام صفحة نقاش المستخدم',
				summary: 'إشعار: إساءة استخدام صفحة نقاش المستخدم',
				hideLinkedPage: true
			},
			'uw-vgscope': {
				label: 'إضافة إرشادات أو غش أو تعليمات لألعاب الفيديو',
				summary: 'إشعار: إضافة إرشادات أو غش أو تعليمات لألعاب الفيديو'
			},
			'uw-warn': {
				label: 'ضع قوالب تحذير المستخدم عند الرجوع عن التخريب',
				summary: 'إشعار: يمكنك استخدام قوالب تحذير المستخدم عند الرجوع عن التخريب'
			},
			'uw-wrongsummary': {
				label: 'استخدام ملخصات تعديل غير دقيقة أو غير مناسبة',
				summary: 'إشعار: استخدام ملخصات تعديل غير دقيقة أو غير مناسبة'
			}
		},

		singlewarn: {
			'uw-3rr': {
				label: 'انتهاك محتمل لقاعدة الثلاثة استرجاعات ؛ انظر أيضًا uw-ew',
				summary: 'تحذير: قاعدة الثلاثة استرجاعات'
			},
			'uw-affiliate': {
				label: 'التسويق بالعمولة',
				summary: 'تحذير: التسويق بالعمولة'
			},
			'uw-attack': {
				label: 'إنشاء صفحات هجوم',
				summary: 'تحذير: إنشاء صفحات هجوم',
				suppressArticleInSummary: true
			},
			'uw-botun': {
				label: 'اسم مستخدم الروبوت',
				summary: 'تحذير: اسم مستخدم الروبوت'
			},
			'uw-canvass': {
				label: 'التجنيد',
				summary: 'تحذير: التجنيد'
			},
			'uw-copyright': {
				label: 'انتهاك حقوق النشر',
				summary: 'تحذير: انتهاك حقوق النشر'
			},
			'uw-copyright-link': {
				label: 'ربط انتهاك الأعمال المحمية بحقوق النشر',
				summary: 'تحذير: ربط انتهاك الأعمال المحمية بحقوق النشر'
			},
			'uw-copyright-new': {
				label: 'انتهاك حقوق النشر (مع شرح للمستخدمين الجدد)',
				summary: 'إشعار: تجنب مشاكل حقوق النشر',
				heading: 'ويكيبيديا وحقوق النشر'
			},
			'uw-copyright-remove': {
				label: 'إزالة قالب {{copyvio}} من المقالات',
				summary: 'تحذير: إزالة قوالب {{copyvio}}'
			},
			'uw-derogatory': {
				label: 'إضافة محتوى مهين / بغيض',
				summary: 'تحذير: إضافة محتوى مهين'
			},
			'uw-efsummary': {
				label: 'ملخص التحرير الذي يؤدي إلى تشغيل مرشح التحرير',
				summary: 'تحذير: ملخص التحرير الذي يؤدي إلى تشغيل مرشح التحرير'
			},
			'uw-ew': {
				label: 'حرب التحرير (صياغة أقوى)',
				summary: 'تحذير: حرب التحرير'
			},
			'uw-ewsoft': {
				label: 'حرب التحرير (صياغة أكثر ليونة للقادمين الجدد)',
				summary: 'تحذير: حرب التحرير'
			},
			'uw-hijacking': {
				label: 'اختطاف المقالات',
				summary: 'تحذير: اختطاف المقالات'
			},
			'uw-hoax': {
				label: 'إنشاء خدع',
				summary: 'تحذير: إنشاء خدع'
			},
			'uw-legal': {
				label: 'إطلاق تهديدات قانونية',
				summary: 'تحذير: إطلاق تهديدات قانونية'
			},
			'uw-login': {
				label: 'التحرير أثناء تسجيل الخروج',
				summary: 'تحذير: التحرير أثناء تسجيل الخروج'
			},
			'uw-multipleIPs': {
				label: 'استخدام عناوين IP متعددة',
				summary: 'تحذير: التخريب باستخدام عناوين IP متعددة'
			},
			'uw-paraphrase': {
				label: 'إعادة الصياغة الوثيقة',
				summary: 'تحذير: إعادة الصياغة الوثيقة'
			},
			'uw-pinfo': {
				label: 'معلومات شخصية (الكشف)',
				summary: 'تحذير: معلومات شخصية'
			},
			'uw-salt': {
				label: 'إعادة إنشاء مقالات مملحة تحت عنوان مختلف',
				summary: 'إشعار: إعادة إنشاء مقالات محمية الإنشاء تحت عنوان مختلف'
			},
			'uw-socksuspect': {
				label: 'استخدام دمى الجورب',
				summary: 'تحذير: أنت [[WP:SOCK|جورب]] مشتبه به' // of User:...
			},
			'uw-upv': {
				label: 'تخريب صفحة المستخدم',
				summary: 'تحذير: تخريب صفحة المستخدم'
			},
			'uw-username': {
				label: 'اسم المستخدم مخالف للسياسة',
				summary: 'تحذير: قد يكون اسم المستخدم الخاص بك مخالفًا للسياسة',
				suppressArticleInSummary: true // not relevant for this template
			},
			'uw-coi-username': {
				label: 'اسم المستخدم مخالف للسياسة، وتضارب مصالح',
				summary: 'تحذير: اسم المستخدم وتضارب المصالح',
				heading: 'اسم المستخدم الخاص بك'
			},
			'uw-userpage': {
				label: 'صفحة المستخدم أو الصفحة الفرعية مخالفة للسياسة',
				summary: 'تحذير: صفحة المستخدم أو الصفحة الفرعية مخالفة للسياسة'
			}
		}
	};

	/**
	 * Reads Twinkle.warn.messages and returns a specified template's property (such as label, summary,
	 * suppressArticleInSummary, hideLinkedPage, or hideReason)
	 */
	Twinkle.warn.getTemplateProperty = function (templates, templateName, propertyName) {
		let result;
		const isNumberedTemplate = templateName.match(/(1|2|3|4|4im)$/);
		if (isNumberedTemplate) {
			const unNumberedTemplateName = templateName.replace(/(?:1|2|3|4|4im)$/, '');
			const level = isNumberedTemplate[0];
			const numberedWarnings = {};
			$.each(templates.levels, (key, val) => {
				$.extend(numberedWarnings, val);
			});
			$.each(numberedWarnings, (key) => {
				if (key === unNumberedTemplateName) {
					result = numberedWarnings[key]['level' + level][propertyName];
				}
			});
		}

		// Non-level templates can also end in a number. So check this for all templates.
		const otherWarnings = {};
		$.each(templates, (key, val) => {
			if (key !== 'levels') {
				$.extend(otherWarnings, val);
			}
		});
		$.each(otherWarnings, (key) => {
			if (key === templateName) {
				result = otherWarnings[key][propertyName];
			}
		});

		return result;
	};

	// Used repeatedly below across menu rebuilds
	Twinkle.warn.prev_article = null;
	Twinkle.warn.prev_reason = null;
	Twinkle.warn.talkpageObj = null;

	Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
		const value = e.target.value;
		const sub_group = e.target.root.sub_group;
		sub_group.main_group = value;
		let old_subvalue = sub_group.value;
		let old_subvalue_re;
		if (old_subvalue) {
			if (value === 'kitchensink') { // Exact match possible in kitchensink menu
				old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue));
			} else {
				old_subvalue = old_subvalue.replace(/\d*(im)?$/, '');
				old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue) + '(\\d*(?:im)?)$');
			}
		}

		while (sub_group.hasChildNodes()) {
			sub_group.removeChild(sub_group.firstChild);
		}

		let selected = false;
		// worker function to create the combo box entries
		const createEntries = function (contents, container, wrapInOptgroup, val = value) {
			// level2->2, singlewarn->''; also used to distinguish the
			// scaled levels from singlenotice, singlewarn, and custom
			const level = val.replace(/^\D+/g, '');
			// due to an apparent iOS bug, we have to add an option-group to prevent truncation of text
			// (search WT:TW archives for "Problem selecting warnings on an iPhone")
			if (wrapInOptgroup && $.client.profile().platform === 'iphone') {
				let wrapperOptgroup = new Morebits.QuickForm.Element({
					type: 'optgroup',
					label: 'القوالب المتاحة'
				});
				wrapperOptgroup = wrapperOptgroup.render();
				container.appendChild(wrapperOptgroup);
				container = wrapperOptgroup;
			}

			$.each(contents, (itemKey, itemProperties) => {
				// Skip if the current template doesn't have a version for the current level
				if (!!level && !itemProperties[val]) {
					return;
				}
				const key = typeof itemKey === 'string' ? itemKey : itemProperties.value;
				const template = key + level;

				const elem = new Morebits.QuickForm.Element({
					type: 'option',
					label: '{{' + template + '}}: ' + (level ? itemProperties[val].label : itemProperties.label),
					value: template
				});

				// Select item best corresponding to previous selection
				if (!selected && old_subvalue && old_subvalue_re.test(template)) {
					elem.data.selected = selected = true;
				}
				const elemRendered = container.appendChild(elem.render());
				$(elemRendered).data('messageData', itemProperties);
			});
		};
		const createGroup = function (warnGroup, label, wrapInOptgroup, val) {
			wrapInOptgroup = typeof wrapInOptgroup !== 'undefined' ? wrapInOptgroup : true;
			let optgroup = new Morebits.QuickForm.Element({
				type: 'optgroup',
				label: label
			});
			optgroup = optgroup.render();
			sub_group.appendChild(optgroup);
			createEntries(warnGroup, optgroup, wrapInOptgroup, val);
		};

		switch (value) {
			case 'singlenotice':
			case 'singlewarn':
				createEntries(Twinkle.warn.messages[value], sub_group, true);
				break;
			case 'singlecombined':
				var unSortedSinglets = $.extend({}, Twinkle.warn.messages.singlenotice, Twinkle.warn.messages.singlewarn);
				var sortedSingletMessages = {};
				Object.keys(unSortedSinglets).sort().forEach((key) => {
					sortedSingletMessages[key] = unSortedSinglets[key];
				});
				createEntries(sortedSingletMessages, sub_group, true);
				break;
			case 'custom':
				createEntries(Twinkle.getPref('customWarningList'), sub_group, true);
				break;
			case 'kitchensink':
				['level1', 'level2', 'level3', 'level4', 'level4im'].forEach((lvl) => {
					$.each(Twinkle.warn.messages.levels, (levelGroupLabel, levelGroup) => {
						createGroup(levelGroup, 'المستوى ' + lvl.slice(5) + ': ' + levelGroupLabel, true, lvl);
					});
				});
				createGroup(Twinkle.warn.messages.singlenotice, 'إشعارات ذات إصدار واحد');
				createGroup(Twinkle.warn.messages.singlewarn, 'تحذيرات ذات إصدار واحد');
				createGroup(Twinkle.getPref('customWarningList'), 'تحذيرات مخصصة');
				break;
			case 'level1':
			case 'level2':
			case 'level3':
			case 'level4':
			case 'level4im':
				// Creates subgroup regardless of whether there is anything to place in it;
				// leaves "Removal of deletion tags" empty for 4im
				$.each(Twinkle.warn.messages.levels, (groupLabel, groupContents) => {
					createGroup(groupContents, groupLabel, false);
				});
				break;
			case 'autolevel':
				// Check user page to determine appropriate level
				var autolevelProc = function () {
					const wikitext = Twinkle.warn.talkpageObj.getPageText();
					// history not needed for autolevel
					const latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
					// Pseudo-params with only what's needed to parse the level i.e. no messageData
					const params = {
						sub_group: old_subvalue,
						article: e.target.root.article.value
					};
					const lvl = 'level' + Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[1];

					// Identical to level1, etc. above but explicitly provides the level
					$.each(Twinkle.warn.messages.levels, (groupLabel, groupContents) => {
						createGroup(groupContents, groupLabel, false, lvl);
					});

					// Trigger subcategory change, add select menu, etc.
					Twinkle.warn.callback.postCategoryCleanup(e);
				};

				if (Twinkle.warn.talkpageObj) {
					autolevelProc();
				} else {
					const usertalk_page = new Morebits.wiki.Page('User_talk:' + mw.config.get('wgRelevantUserName'), 'جارٍ تحميل التحذيرات السابقة');
					usertalk_page.setFollowRedirect(true, false);
					usertalk_page.load((pageobj) => {
						Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj
						autolevelProc();
					}, () => {
						// Catch and warn if the talkpage can't load,
						// most likely because it's a cross-namespace redirect
						// Supersedes the typical $autolevelMessage added in autolevelParseWikitext
						const $noTalkPageNode = $('<strong>', {
							text: 'تعذر تحميل صفحة نقاش المستخدم. قد تكون عملية إعادة توجيه عبر مساحات الأسماء. لن يعمل الكشف التلقائي عن المستوى.',
							id: 'twinkle-warn-autolevel-message',
							css: { color: 'red' }
						});
						$noTalkPageNode.insertBefore($('#twinkle-warn-warning-messages'));
						// If a preview was opened while in a different mode, close it
						// Should nullify the need to catch the error in preview callback
						e.target.root.previewer.closePreview();
					});
				}
				break;
			default:
				alert('مجموعة تحذير غير معروفة في twinklewarn');
				break;
		}

		// Trigger subcategory change, add select menu, etc.
		// Here because of the async load for autolevel
		if (value !== 'autolevel') {
			// reset any autolevel-specific messages while we're here
			$('#twinkle-warn-autolevel-message').remove();

			Twinkle.warn.callback.postCategoryCleanup(e);
		}
	};

	Twinkle.warn.callback.postCategoryCleanup = function twinklewarnCallbackPostCategoryCleanup(e) {
		// clear overridden label on article textbox
		Morebits.QuickForm.setElementTooltipVisibility(e.target.root.article, true);
		Morebits.QuickForm.resetElementLabel(e.target.root.article);
		// Trigger custom label/change on main category change
		Twinkle.warn.callback.change_subcategory(e);

		// Use select2 to make the select menu searchable
		if (!Twinkle.getPref('oldSelect')) {
			$('select[name=sub_group]')
				.select2({
					theme: 'default select2-morebits',
					width: '100%',
					matcher: Morebits.select2.matchers.optgroupFull,
					templateResult: Morebits.select2.highlightSearchMatches,
					language: {
						searching: Morebits.select2.queryInterceptor
					}
				})
				.change(Twinkle.warn.callback.change_subcategory);

			$('.select2-selection').on('keydown', Morebits.select2.autoStart).trigger('focus');

			mw.util.addCSS(
				// Increase height
				'.select2-container .select2-dropdown .select2-results > .select2-results__options { max-height: 350px; }' +

				// Reduce padding
				'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
				'.select2-results .select2-results__group { padding-top: 1px; padding-bottom: 1px; } ' +

				// Adjust font size
				'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
				'.select2-container .selection .select2-selection__rendered { font-size: 13px; }'
			);
		}
	};

	Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
		const selected_main_group = e.target.form.main_group.value;
		const selected_template = e.target.form.sub_group.value;

		// If template shouldn't have a linked article, hide the linked article label and text box
		const hideLinkedPage = Twinkle.warn.getTemplateProperty(Twinkle.warn.messages, selected_template, 'hideLinkedPage');
		if (hideLinkedPage) {
			e.target.form.article.value = '';
			Morebits.QuickForm.setElementVisibility(e.target.form.article.parentElement, false);
		} else {
			Morebits.QuickForm.setElementVisibility(e.target.form.article.parentElement, true);
		}

		// If template shouldn't have an optional message, hide the optional message label and text box
		const hideReason = Twinkle.warn.getTemplateProperty(Twinkle.warn.messages, selected_template, 'hideReason');
		if (hideReason) {
			e.target.form.reason.value = '';
			Morebits.QuickForm.setElementVisibility(e.target.form.reason.parentElement, false);
		} else {
			Morebits.QuickForm.setElementVisibility(e.target.form.reason.parentElement, true);
		}

		// Tags that don't take a linked article, but something else (often a username).
		// The value of each tag is the label next to the input field
		const notLinkedArticle = {
			'uw-agf-sock': 'اسم المستخدم الاختياري للحساب الآخر (بدون المستخدم:) ',
			'uw-bite': "اسم المستخدم للمستخدم 'المعضوض' (بدون المستخدم:) ",
			'uw-socksuspect': 'اسم مستخدم مدير الجورب ، إذا كان معروفًا (بدون المستخدم:) ',
			'uw-username': 'اسم المستخدم ينتهك السياسة بسبب... ',
			'uw-aiv': 'اسم المستخدم الاختياري الذي تم الإبلاغ عنه (بدون المستخدم:) '
		};

		const hasLevel = ['singlenotice', 'singlewarn', 'singlecombined', 'kitchensink'].includes(selected_main_group);
		if (hasLevel) {
			if (notLinkedArticle[selected_template]) {
				if (Twinkle.warn.prev_article === null) {
					Twinkle.warn.prev_article = e.target.form.article.value;
				}
				e.target.form.article.notArticle = true;
				e.target.form.article.value = '';

				// change form labels according to the warning selected
				Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, false);
				Morebits.QuickForm.overrideElementLabel(e.target.form.article, notLinkedArticle[selected_template]);
			} else if (e.target.form.article.notArticle) {
				if (Twinkle.warn.prev_article !== null) {
					e.target.form.article.value = Twinkle.warn.prev_article;
					Twinkle.warn.prev_article = null;
				}
				e.target.form.article.notArticle = false;
				Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, true);
				Morebits.QuickForm.resetElementLabel(e.target.form.article);
			}
		}

		// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
		$('#tw-warn-red-notice').remove();
		let $redWarning;
		if (selected_template === 'uw-username') {
			$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>يجب <b>عدم</b> استخدام {{uw-username}} لانتهاكات سياسة اسم المستخدم <b>الصارخة</b>. " +
				"يجب الإبلاغ عن الانتهاكات الصارخة مباشرة إلى UAA (عبر علامة تبويب ARV في Twinkle). " +
				'يجب استخدام {{uw-username}} فقط في الحالات الطارئة من أجل الانخراط في مناقشة مع المستخدم.</div>');
			$redWarning.insertAfter(Morebits.QuickForm.getElementLabelObject(e.target.form.reasonGroup));
		} else if (selected_template === 'uw-coi-username') {
			$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>يجب <b>عدم</b> استخدام {{uw-coi-username}} لانتهاكات سياسة اسم المستخدم <b>الصارخة</b>. " +
				"يجب الإبلاغ عن الانتهاكات الصارخة مباشرة إلى UAA (عبر علامة تبويب ARV في Twinkle). " +
				'يجب استخدام {{uw-coi-username}} فقط في الحالات الطارئة من أجل الانخراط في مناقشة مع المستخدم.</div>');
			$redWarning.insertAfter(Morebits.QuickForm.getElementLabelObject(e.target.form.reasonGroup));
		}
	};

	Twinkle.warn.callbacks = {
		getWarningWikitext: function (templateName, article, reason, isCustom) {
			let text = '{{subst:' + templateName;

			// add linked article for user warnings
			if (article) {
				// c&pmove has the source as the first parameter
				if (templateName === 'uw-c&pmove') {
					text += '|to=' + article;
				} else {
					text += '|1=' + article;
				}
			}
			if (reason && !isCustom) {
				// add extra message
				if (templateName === 'uw-csd' || templateName === 'uw-probation' ||
					templateName === 'uw-userspacenoindex' || templateName === 'uw-userpage') {
					text += "|3=''" + reason + "''";
				} else {
					text += "|2=''" + reason + "''";
				}
			}
			text += '}}';

			if (reason && isCustom) {
				// we assume that custom warnings lack a {{{2}}} parameter
				text += " ''" + reason + "''";
			}

			return text + ' ~~~~';
		},
		showPreview: function (form, templatename) {
			const input = Morebits.QuickForm.getInputData(form);
			// Provided on autolevel, not otherwise
			templatename = templatename || input.sub_group;
			const linkedarticle = input.article;
			const templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle,
				input.reason, input.main_group === 'custom');

			form.previewer.beginRender(templatetext, 'User_talk:' + mw.config.get('wgRelevantUserName')); // Force wikitext/correct username
		},
		// Just a pass-through unless the autolevel option was selected
		preview: function (form) {
			if (form.main_group.value === 'autolevel') {
				// Always get a new, updated talkpage for autolevel processing
				const usertalk_page = new Morebits.wiki.Page('User_talk:' + mw.config.get('wgRelevantUserName'), 'جارٍ تحميل التحذيرات السابقة');
				usertalk_page.setFollowRedirect(true, false);
				// Will fail silently if the talk page is a cross-ns redirect,
				// removal of the preview box handled when loading the menu
				usertalk_page.load((pageobj) => {
					Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj

					const wikitext = pageobj.getPageText();
					// history not needed for autolevel
					const latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
					const params = {
						sub_group: form.sub_group.value,
						article: form.article.value,
						messageData: $(form.sub_group).find('option[value="' + $(form.sub_group).val() + '"]').data('messageData')
					};
					const template = Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[0];
					Twinkle.warn.callbacks.showPreview(form, template);

					// If the templates have diverged, fake a change event
					// to reload the menu with the updated pageobj
					if (form.sub_group.value !== template) {
						const evt = document.createEvent('Event');
						evt.initEvent('change', true, true);
						form.main_group.dispatchEvent(evt);
					}
				});
			} else {
				Twinkle.warn.callbacks.showPreview(form);
			}
		},
		/**
		 * Used in the main and autolevel loops to determine when to warn
		 * about excessively recent, stale, or identical warnings.
		 *
		 * @param {string} wikitext  The text of a user's talk page, from getPageText()
		 * @return {Object[]} - Array of objects: latest contains most recent
		 * warning and date; history lists all prior warnings
		 */
		dateProcessing: function (wikitext) {
			const history_re = /<!--\s?Template:([uU]w-.*?)\s?-->.*?(\d{1,2}:\d{1,2}, \d{1,2} \w+ \d{4} \(UTC\))/g;
			const history = {};
			const latest = { date: new Morebits.Date(0), type: '' };
			let current;

			while ((current = history_re.exec(wikitext)) !== null) {
				const template = current[1], current_date = new Morebits.Date(current[2]);
				if (!(template in history) || history[template].isBefore(current_date)) {
					history[template] = current_date;
				}
				if (!latest.date.isAfter(current_date)) {
					latest.date = current_date;
					latest.type = template;
				}
			}
			return [latest, history];
		},
		/**
		 * Main loop for deciding what the level should increment to. Most of
		 * this is really just error catching and updating the subsequent data.
		 * May produce up to two notices in a twinkle-warn-autolevel-messages div
		 *
		 * @param {string} wikitext  The text of a user's talk page, from getPageText() (required)
		 * @param {Object} params  Params object: sub_group is the template (required);
		 * article is the user-provided article (form.article) used to link ARV on recent level4 warnings;
		 * messageData is only necessary if getting the full template, as it's
		 * used to ensure a valid template of that level exists
		 * @param {Object} latest  First element of the array returned from
		 * dateProcessing. Provided here rather than processed within to avoid
		 * repeated call to dateProcessing
		 * @param {(Date|Morebits.Date)} date  Date from which staleness is determined
		 * @param {Morebits.Status} statelem  Status element, only used for handling error in final execution
		 *
		 * @return {Array} - Array that contains the full template and just the warning level
		 */
		autolevelParseWikitext: function (wikitext, params, latest, date, statelem) {
			let level; // undefined rather than '' means the isNaN below will return true
			if (/\d(?:im)?$/.test(latest.type)) { // level1-4im
				level = parseInt(latest.type.replace(/.*(\d)(?:im)?$/, '$1'), 10);
			} else if (latest.type) { // Non-numbered warning
				// Try to leverage existing categorization of
				// warnings, all but one are universally lowercased
				const loweredType = /uw-multipleIPs/i.test(latest.type) ? 'uw-multipleIPs' : latest.type.toLowerCase();
				// It would be nice to account for blocks, but in most
				// cases the hidden message is terminal, not the sig
				if (Twinkle.warn.messages.singlewarn[loweredType]) {
					level = 3;
				} else {
					level = 1; // singlenotice or not found
				}
			}

			const $autolevelMessage = $('<div>', { id: 'twinkle-warn-autolevel-message' });

			if (isNaN(level)) { // No prior warnings found, this is the first
				level = 1;
			} else if (level > 4 || level < 1) { // Shouldn't happen
				const message = 'تعذر تحليل مستوى التحذير السابق، يرجى تحديد مستوى التحذير يدويًا.';
				if (statelem) {
					statelem.error(message);
				} else {
					alert(message);
				}
				return;
			} else {
				date = date || new Date();
				const autoTimeout = new Morebits.Date(latest.date.getTime()).add(parseInt(Twinkle.getPref('autolevelStaleDays'), 10), 'days');
				if (autoTimeout.isAfter(date)) {
					if (level === 4) {
						level = 4;
						// Basically indicates whether we're in the final Main evaluation or not,
						// and thus whether we can continue or need to display the warning and link
						if (!statelem) {
							const $link = $('<a>', {
								href: '#',
								text: 'انقر هنا لفتح أداة ARV.',
								css: { fontWeight: 'bold' },
								click: function () {
									Morebits.wiki.actionCompleted.redirect = null;
									Twinkle.warn.dialog.close();
									Twinkle.arv.callback(mw.config.get('wgRelevantUserName'));
									$('input[name=page]').val(params.article); // Target page
									$('input[value=final]').prop('checked', true); // Vandalism after final
								}
							});
							const $statusNode = $('<div>', {
								text: mw.config.get('wgRelevantUserName') + ' تلقى مؤخرًا تحذيرًا من المستوى 4 (' + latest.type + ') لذلك قد يكون من الأفضل الإبلاغ عنه بدلاً من ذلك ؛ ',
								css: { color: 'red' }
							});
							$statusNode.append($link[0]);
							$autolevelMessage.append($statusNode);
						}
					} else { // Automatically increase severity
						level += 1;
					}
				} else { // Reset warning level if most-recent warning is too old
					level = 1;
				}
			}

			$autolevelMessage.prepend($('<div>سيصدر قالب <span style="font-weight: bold;">مستوى ' + level + '</span>.</div>'));
			// Place after the stale and other-user-reverted (text-only) messages
			$('#twinkle-warn-autolevel-message').remove(); // clean slate
			$autolevelMessage.insertAfter($('#twinkle-warn-warning-messages'));

			let template = params.sub_group.replace(/(.*)\d$/, '$1');
			// Validate warning level, falling back to the uw-generic series.
			// Only a few items are missing a level, and in all but a handful
			// of cases, the uw-generic series is explicitly used elsewhere per WP:UTM.
			if (params.messageData && !params.messageData['level' + level]) {
				template = 'uw-generic';
			}
			template += level;

			return [template, level];
		},
		main: function (pageobj) {
			const text = pageobj.getPageText();
			const statelem = pageobj.getStatusElement();
			const params = pageobj.getCallbackParameters();
			let messageData = params.messageData;

			const [latest, history] = Twinkle.warn.callbacks.dateProcessing(text);

			const now = new Morebits.Date(pageobj.getLoadTime());

			Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj, just in case
			if (params.main_group === 'autolevel') {
				// [template, level]
				const templateAndLevel = Twinkle.warn.callbacks.autolevelParseWikitext(text, params, latest, now, statelem);

				// Only if there's a change from the prior display/load
				if (params.sub_group !== templateAndLevel[0] && !confirm('سيصدر قالب {{' + templateAndLevel[0] + '}} للمستخدم، هل هذا صحيح؟')) {
					statelem.error('تم الإحباط بناءً على طلب المستخدم');
					return;
				}
				// Update params now that we've selected a warning
				params.sub_group = templateAndLevel[0];
				messageData = params.messageData['level' + templateAndLevel[1]];
			} else if (params.sub_group in history) {
				if (new Morebits.Date(history[params.sub_group]).add(1, 'day').isAfter(now)) {
					if (!confirm('تم إصدار ' + params.sub_group + ' مطابق في آخر 24 ساعة. \nهل ما زلت ترغب في إضافة هذا التحذير / الإشعار؟')) {
						statelem.error('تم الإحباط بناءً على طلب المستخدم');
						return;
					}
				}
			}

			latest.date.add(1, 'minute'); // after long debate, one minute is max

			if (latest.date.isAfter(now)) {
				if (!confirm('تم إصدار ' + latest.type + ' في الدقيقة الأخيرة. \nهل ما زلت ترغب في إضافة هذا التحذير / الإشعار؟')) {
					statelem.error('تم الإحباط بناءً على طلب المستخدم');
					return;
				}
			}

			// build the edit summary
			// Function to handle generation of summary prefix for custom templates
			const customProcess = function (template) {
				template = template.split('|')[0];
				let prefix;
				switch (template.slice(-1)) {
					case '1':
						prefix = 'ملاحظة عامة';
						break;
					case '2':
						prefix = 'تحذير';
						break;
					case '3':
						prefix = 'تحذير';
						break;
					case '4':
						prefix = 'تحذير نهائي';
						break;
					case 'm':
						if (template.slice(-3) === '4im') {
							prefix = 'التحذير الوحيد';
							break;
						}
					// falls through
					default:
						prefix = 'إشعار';
						break;
				}
				return prefix + ': ' + Morebits.string.toUpperCaseFirstChar(messageData.label);
			};

			let summary;
			if (params.main_group === 'custom') {
				summary = customProcess(params.sub_group);
			} else {
				// Normalize kitchensink to the 1-4im style
				if (params.main_group === 'kitchensink' && !/^D+$/.test(params.sub_group)) {
					let sub = params.sub_group.slice(-1);
					if (sub === 'm') {
						sub = params.sub_group.slice(-3);
					}
					// Don't overwrite uw-3rr, technically unnecessary
					if (/\d/.test(sub)) {
						params.main_group = 'level' + sub;
					}
				}
				// singlet || level1-4im, no need to /^\D+$/.test(params.main_group)
				summary = messageData.summary || (messageData[params.main_group] && messageData[params.main_group].summary);
				// Not in Twinkle.warn.messages, assume custom template
				if (!summary) {
					summary = customProcess(params.sub_group);
				}
				if (messageData.suppressArticleInSummary !== true && params.article) {
					if (params.sub_group === 'uw-agf-sock' ||
						params.sub_group === 'uw-socksuspect' ||
						params.sub_group === 'uw-aiv') { // these templates require a username
						summary += ' من [[:User:' + params.article + ']]';
					} else {
						summary += ' في [[:' + params.article + ']]';
					}
				}
			}

			pageobj.setEditSummary(summary + '.');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('watchWarnings'));

			// Get actual warning text
			let warningText = Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
				params.reason, params.main_group === 'custom');
			if (Twinkle.getPref('showSharedIPNotice') && mw.util.isIPAddress(mw.config.get('wgTitle'))) {
				Morebits.Status.info('معلومات', 'إضافة إشعار IP مشترك');
				warningText += '\n{{subst:Shared IP advice}}';
			}

			let sectionExists = false, sectionNumber = 0;
			// Only check sections if there are sections or there's a chance we won't create our own
			if (!messageData.heading && text.length) {
				// Get all sections
				const sections = text.match(/^(==*).+\1/gm);
				if (sections && sections.length !== 0) {
					// Find the index of the section header in question
					const dateHeaderRegex = now.monthHeaderRegex();
					sectionNumber = 0;
					// Find this month's section among L2 sections, preferring the bottom-most
					sectionExists = sections.reverse().some((sec, idx) => /^(==)[^=].+\1/m.test(sec) && dateHeaderRegex.test(sec) && typeof (sectionNumber = sections.length - 1 - idx) === 'number');
				}
			}

			if (sectionExists) { // append to existing section
				pageobj.setPageSection(sectionNumber + 1);
				pageobj.setAppendText('\n\n' + warningText);
				pageobj.append();
			} else {
				if (messageData.heading) { // create new section
					pageobj.setNewSectionTitle(messageData.heading);
				} else {
					Morebits.Status.info('معلومات', 'سيتم إنشاء قسم صفحة نقاش جديد لهذا الشهر، حيث لم يتم العثور على أي قسم');
					pageobj.setNewSectionTitle(now.monthHeader(0));
				}
				pageobj.setNewSectionText(warningText);
				pageobj.newSection();
			}
		}
	};

	Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {
		const userTalkPage = 'User_talk:' + mw.config.get('wgRelevantUserName');

		// reason, main_group, sub_group, article
		const params = Morebits.QuickForm.getInputData(e.target);

		// Check that a reason was filled in if uw-username was selected
		if (params.sub_group === 'uw-username' && !params.article) {
			alert('يجب عليك تقديم سبب لقالب {{uw-username}}.');
			return;
		}

		// The autolevel option will already know by now if a user talk page
		// is a cross-namespace redirect (via !!Twinkle.warn.talkpageObj), so
		// technically we could alert an error here, but the user will have
		// already ignored the bold red error above.  Moreover, they probably
		// *don't* want to actually issue a warning, so the error handling
		// after the form is submitted is probably preferable

		// Find the selected <option> element so we can fetch the data structure
		const $selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');
		params.messageData = $selectedEl.data('messageData');

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(e.target);

		Morebits.wiki.actionCompleted.redirect = userTalkPage;
		Morebits.wiki.actionCompleted.notice = 'اكتمل التحذير، وسيُعاد تحميل صفحة النقاش في بضع ثوانٍ';

		const wikipedia_page = new Morebits.wiki.Page(userTalkPage, 'تعديل صفحة نقاش المستخدم');
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setFollowRedirect(true, false);
		wikipedia_page.load(Twinkle.warn.callbacks.main);
	};

	Twinkle.addInitCallback(Twinkle.warn, 'warn');
}());

// </nowiki>
