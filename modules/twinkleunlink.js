// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleunlink.js: وحدة إزالة الروابط
	 ****************************************
	 * وضع الاستدعاء:     علامة تبويب ("إزالة الرابط")
	 * نشط في:              صفحات غير خاصة، باستثناء ويكيبيديا:الميدان
	 */

	Twinkle.unlink = function twinkleunlink() {
		if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageName') === 'Wikipedia:Sandbox' ||
			// Restrict to extended confirmed users (see #428)
			(!Morebits.userIsInGroup('extendedconfirmed') && !Morebits.userIsSysop)) {
			return;
		}
		Twinkle.addPortletLink(Twinkle.unlink.callback, 'إزالة الرابط', 'tw-unlink', 'إزالة الصفحات المرتبطة');
	};

	// the parameter is used when invoking unlink from admin speedy
	Twinkle.unlink.callback = function (presetReason) {
		const fileSpace = mw.config.get('wgNamespaceNumber') === 6;

		const Window = new Morebits.SimpleWindow(600, 440);
		Window.setTitle('إزالة الصفحات المرتبطة' + (fileSpace ? ' واستخدامات الملف' : ''));
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('تفضيلات إزالة الرابط', 'ويكيبيديا:Twinkle/Preferences#unlink');
		Window.addFooterLink('مساعدة لمح البصر!', 'ويكيبيديا:لمح البصر/توثيق#unlink');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.unlink.callback.evaluate);

		// prepend some documentation: files are commented out, while any
		// display text is preserved for links (otherwise the link itself is used)
		const linkTextBefore = Morebits.htmlNode('code', '[[' + (fileSpace ? ':' : '') + Morebits.pageNameNorm + '|نص الرابط]]');
		const linkTextAfter = Morebits.htmlNode('code', 'نص الرابط');
		const linkPlainBefore = Morebits.htmlNode('code', '[[' + Morebits.pageNameNorm + ']]');
		let linkPlainAfter;
		if (fileSpace) {
			linkPlainAfter = Morebits.htmlNode('code', '<!-- [[' + Morebits.pageNameNorm + ']] -->');
		} else {
			linkPlainAfter = Morebits.htmlNode('code', Morebits.pageNameNorm);
		}

		form.append({
			type: 'div',
			style: 'margin-bottom: 0.5em',
			label: [
				'تتيح لك هذه الأداة إزالة ارتباط جميع الروابط الواردة ("الصفحات المرتبطة") من الصفحات المحددة أدناه التي تشير إلى هذه الصفحة' +
				(fileSpace ? '، و/أو إخفاء جميع تضمينات هذا الملف عن طريق تغليفها في ترميز تعليق <!-- --> ' : '') +
				'. على سبيل المثال، ',
				linkTextBefore, ' سيصبح ', linkTextAfter, ' و ',
				linkPlainBefore, ' سيصبح ', linkPlainAfter, '. لن تزيل هذه الأداة ارتباط عمليات إعادة التوجيه أو الروابط داخل هذه الصفحة ("الروابط الذاتية") التي تشير إلى هذه الصفحة. استخدمه بحذر.'
			]
		});

		form.append({
			type: 'input',
			name: 'reason',
			label: 'السبب:',
			value: presetReason || '',
			size: 60
		});

		const query = {
			action: 'query',
			list: 'backlinks',
			bltitle: mw.config.get('wgPageName'),
			bllimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
			blnamespace: Twinkle.getPref('unlinkNamespaces'),
			rawcontinue: true,
			format: 'json'
		};
		if (fileSpace) {
			query.list += '|imageusage';
			query.iutitle = query.bltitle;
			query.iulimit = query.bllimit;
			query.iunamespace = query.blnamespace;
		} else {
			query.blfilterredir = 'nonredirects';
		}
		const wikipedia_api = new Morebits.wiki.Api('جلب الصفحات المرتبطة', query, Twinkle.unlink.callbacks.display.backlinks);
		wikipedia_api.params = { form: form, Window: Window, image: fileSpace };
		wikipedia_api.post();

		const root = document.createElement('div');
		root.style.padding = '15px'; // just so it doesn't look broken
		Morebits.Status.init(root);
		wikipedia_api.statelem.status('تحميل...');
		Window.setContent(root);
		Window.display();
	};

	Twinkle.unlink.callback.evaluate = function twinkleunlinkCallbackEvaluate(event) {
		const form = event.target;
		const input = Morebits.QuickForm.getInputData(form);

		if (!input.reason) {
			alert('يجب تحديد سبب لإزالة الارتباط.');
			return;
		}

		input.backlinks = input.backlinks || [];
		input.imageusage = input.imageusage || [];
		const pages = Morebits.array.uniq(input.backlinks.concat(input.imageusage));
		if (!pages.length) {
			alert('يجب تحديد عنصر واحد على الأقل لإزالة الارتباط.');
			return;
		}

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		const unlinker = new Morebits.BatchOperation('إزالة الارتباط ' + (input.backlinks.length ? 'صفحات مرتبطة' +
			(input.imageusage.length ? ' وحالات استخدام الملف' : '') : 'حالات استخدام الملف'));
		unlinker.setOption('preserveIndividualStatusLines', true);
		unlinker.setPageList(pages);
		const params = { reason: input.reason, unlinker: unlinker };
		unlinker.run((pageName) => {
			const wikipedia_page = new Morebits.wiki.Page(pageName, 'إزالة الارتباط في الصفحة "' + pageName + '"');
			wikipedia_page.setBotEdit(true); // unlink considered a floody operation
			wikipedia_page.setCallbackParameters($.extend({
				doBacklinks: input.backlinks.includes(pageName),
				doImageusage: input.imageusage.includes(pageName)
			}, params));
			wikipedia_page.load(Twinkle.unlink.callbacks.unlinkBacklinks);
		});
	};

	Twinkle.unlink.callbacks = {
		display: {
			backlinks: function twinkleunlinkCallbackDisplayBacklinks(apiobj) {
				const response = apiobj.getResponse();
				let havecontent = false;
				let list, namespaces, i;

				if (apiobj.params.image) {
					const imageusage = response.query.imageusage.sort(Twinkle.sortByNamespace);
					list = [];
					for (i = 0; i < imageusage.length; ++i) {
						// Label made by Twinkle.generateBatchPageLinks
						list.push({ label: '', value: imageusage[i].title, checked: true });
					}
					if (!list.length) {
						apiobj.params.form.append({ type: 'div', label: 'لم يُعثر على حالات استخدام للملف.' });
					} else {
						apiobj.params.form.append({ type: 'header', label: 'استخدام الملف' });
						namespaces = [];
						$.each(Twinkle.getPref('unlinkNamespaces'), (k, v) => {
							namespaces.push(v === '0' ? '(مقالة)' : mw.config.get('wgFormattedNamespaces')[v]);
						});
						apiobj.params.form.append({
							type: 'div',
							label: 'النطاق المناسب: ' + namespaces.join(', '),
							tooltip: 'يمكنك تغيير هذا من خلال تفضيلات توينكل الخاصة بك، في [[WP:TWPREFS]]'
						});
						if (response['query-continue'] && response['query-continue'].imageusage) {
							apiobj.params.form.append({
								type: 'div',
								label: 'يظهر الاستخدام الأول للملف ' + mw.language.convertNumber(list.length)
							});
						}
						apiobj.params.form.append({
							type: 'button',
							label: 'تحديد الكل',
							event: function (e) {
								$(Morebits.QuickForm.getElements(e.target.form, 'imageusage')).prop('checked', true);
							}
						});
						apiobj.params.form.append({
							type: 'button',
							label: 'إلغاء تحديد الكل',
							event: function (e) {
								$(Morebits.QuickForm.getElements(e.target.form, 'imageusage')).prop('checked', false);
							}
						});
						apiobj.params.form.append({
							type: 'checkbox',
							name: 'imageusage',
							shiftClickSupport: true,
							list: list
						});
						havecontent = true;
					}
				}

				const backlinks = response.query.backlinks.sort(Twinkle.sortByNamespace);
				if (backlinks.length > 0) {
					list = [];
					for (i = 0; i < backlinks.length; ++i) {
						// Label made by Twinkle.generateBatchPageLinks
						list.push({ label: '', value: backlinks[i].title, checked: true });
					}
					apiobj.params.form.append({ type: 'header', label: 'صفحات مرتبطة' });
					namespaces = [];
					$.each(Twinkle.getPref('unlinkNamespaces'), (k, v) => {
						namespaces.push(v === '0' ? '(مقالة)' : mw.config.get('wgFormattedNamespaces')[v]);
					});
					apiobj.params.form.append({
						type: 'div',
						label: 'النطاق المناسب: ' + namespaces.join(', '),
						tooltip: 'يمكنك تغيير هذا من خلال تفضيلات توينكل الخاصة بك، المرتبطة في الجزء السفلي من نافذة توينكل هذه'
					});
					if (response['query-continue'] && response['query-continue'].backlinks) {
						apiobj.params.form.append({
							type: 'div',
							label: 'يظهر الرابط الخلفي الأول ' + mw.language.convertNumber(list.length)
						});
					}
					apiobj.params.form.append({
						type: 'button',
						label: 'تحديد الكل',
						event: function (e) {
							$(Morebits.QuickForm.getElements(e.target.form, 'backlinks')).prop('checked', true);
						}
					});
					apiobj.params.form.append({
						type: 'button',
						label: 'إلغاء تحديد الكل',
						event: function (e) {
							$(Morebits.QuickForm.getElements(e.target.form, 'backlinks')).prop('checked', false);
						}
					});
					apiobj.params.form.append({
						type: 'checkbox',
						name: 'backlinks',
						shiftClickSupport: true,
						list: list
					});
					havecontent = true;
				} else {
					apiobj.params.form.append({ type: 'div', label: 'لم يُعثر على صفحات مرتبطة.' });
				}

				if (havecontent) {
					apiobj.params.form.append({ type: 'submit' });
				}

				const result = apiobj.params.form.render();
				apiobj.params.Window.setContent(result);

				Morebits.QuickForm.getElements(result, 'backlinks').forEach(Twinkle.generateBatchPageLinks);
				Morebits.QuickForm.getElements(result, 'imageusage').forEach(Twinkle.generateBatchPageLinks);

			}
		},
		unlinkBacklinks: function twinkleunlinkCallbackUnlinkBacklinks(pageobj) {
			let oldtext = pageobj.getPageText();
			const params = pageobj.getCallbackParameters();
			const wikiPage = new Morebits.wikitext.Page(oldtext);

			let summaryText = '', warningString = false;
			let text;

			// remove image usages
			if (params.doImageusage) {
				text = wikiPage.commentOutImage(mw.config.get('wgTitle'), 'تم التعليق').getText();
				// did we actually make any changes?
				if (text === oldtext) {
					warningString = 'استخدامات الملف';
				} else {
					summaryText = 'التعليق على استخدام (استخدامات) الملف';
					oldtext = text;
				}
			}

			// remove backlinks
			if (params.doBacklinks) {
				text = wikiPage.removeLink(Morebits.pageNameNorm).getText();
				// did we actually make any changes?
				if (text === oldtext) {
					warningString = warningString ? 'صفحات مرتبطة أو استخدامات الملف' : 'صفحات مرتبطة';
				} else {
					summaryText = (summaryText ? summaryText + ' / ' : '') + 'إزالة الرابط (الروابط) إلى';
					oldtext = text;
				}
			}

			if (warningString) {
				// nothing to do!
				pageobj.getStatusElement().error("لم يُعثر على أي " + warningString + ' في الصفحة.');
				params.unlinker.workerFailure(pageobj);
				return;
			}

			pageobj.setPageText(text);
			pageobj.setEditSummary(summaryText + ' "' + Morebits.pageNameNorm + '": ' + params.reason + '.');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setCreateOption('nocreate');
			pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
		}
	};

	Twinkle.addInitCallback(Twinkle.unlink, 'unlink');
}());

// </nowiki>
