// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleprod.js: PROD module
	 ****************************************
	 * Mode of invocation:     Tab ("PROD")
	 * Active on:              Existing articles, files which are not redirects
	 */

	Twinkle.prod = function twinkleprod() {
		if ((![0, 6].includes(mw.config.get('wgNamespaceNumber'))) ||
			!mw.config.get('wgCurRevisionId') ||
			Morebits.isPageRedirect()) {
			return;
		}

		Twinkle.addPortletLink(Twinkle.prod.callback, 'PROD', 'tw-prod', 'اقتراح الحذف عبر WP:PROD');
	};

	// Used in edit summaries, for comparisons, etc.
	let namespace;

	Twinkle.prod.callback = function twinkleprodCallback() {
		Twinkle.prod.defaultReason = Twinkle.getPref('prodReasonDefault');

		switch (mw.config.get('wgNamespaceNumber')) {
			case 0:
				namespace = 'article';
				break;
			case 6:
				namespace = 'file';
				break;
			// no default
		}

		const Window = new Morebits.SimpleWindow(800, 410);
		Window.setTitle('الحذف المقترح (PROD)');
		Window.setScriptName('Twinkle');

		const form = new Morebits.QuickForm(Twinkle.prod.callback.evaluate);

		if (namespace === 'article') {
			Window.addFooterLink('سياسة الحذف المقترح', 'WP:PROD');
			Window.addFooterLink('سياسة BLP PROD', 'WP:BLPPROD');
		} else { // if file
			Window.addFooterLink('سياسة الحذف المقترح', 'WP:PROD');
		}

		const field = form.append({
			type: 'field',
			label: 'نوع PROD',
			id: 'prodtype_fieldset'
		});

		field.append({
			type: 'div',
			label: '', // Added later by Twinkle.makeFindSourcesDiv()
			id: 'twinkle-prod-findsources',
			style: 'margin-bottom: 5px; margin-top: -5px;'
		});

		field.append({
			type: 'radio',
			name: 'prodtype',
			event: Twinkle.prod.callback.prodtypechanged,
			list: [
				{
					label: 'PROD (حذف مقترح)',
					value: 'prod',
					checked: true,
					tooltip: 'حذف مقترح عادي، لكل [[WP:PROD]]'
				},
				{
					label: 'BLP PROD (حذف مقترح لـ BLPs غير الموثقة)',
					value: 'prodblp',
					tooltip: 'الحذف المقترح لسير ذاتية جديدة وغير موثقة بالكامل لشخصيات حية، لكل [[WP:BLPPROD]]'
				}
			]
		});

		// Placeholder fieldset to be replaced in Twinkle.prod.callback.prodtypechanged
		form.append({
			type: 'field',
			name: 'parameters'
		});

		Window.addFooterLink('تفضيلات PROD', 'WP:TW/PREF#prod');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#prod');
		Window.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		form.append({ type: 'submit', label: 'اقتراح الحذف' });

		const result = form.render();
		Window.setContent(result);
		Window.display();

		// Hide fieldset for File PROD type since only normal PROD is allowed
		if (namespace !== 'article') {
			$(result).find('#prodtype_fieldset').hide();
		}

		// Fake a change event on the first prod type radio, to initialize the type-dependent controls
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.prodtype[0].dispatchEvent(evt);

	};

	Twinkle.prod.callback.prodtypechanged = function (event) {
		// prepare frame for prod type dependant controls
		const field = new Morebits.QuickForm.Element({
			type: 'field',
			label: 'المعلمات',
			name: 'parameters'
		});
		// create prod type dependant controls
		switch (event.target.values) {
			case 'prod':
				field.append({
					type: 'checkbox',
					list: [
						{
							label: 'إعلام مُنشئ الصفحة إذا أمكن',
							value: 'notify',
							name: 'notify',
							tooltip: "سيتم وضع قالب إشعار في صفحة نقاش المنشئ إذا كان هذا صحيحًا.",
							checked: true
						}
					]
				});
				field.append({
					type: 'textarea',
					name: 'reason',
					label: 'سبب الحذف المقترح:',
					value: Twinkle.prod.defaultReason
				});
				break;

			case 'prodblp':
				// first, remember the prod value that the user entered in the textarea, in case they want to switch back. We can abuse the config field for that.
				if (event.target.form.reason) {
					Twinkle.prod.defaultReason = event.target.form.reason.value;
				}

				field.append({
					type: 'checkbox',
					list: [
						{
							label: 'إعلام مُنشئ الصفحة إذا أمكن',
							value: 'notify',
							name: 'notify',
							tooltip: 'يجب إعلام مُنشئ المقالة.',
							checked: true,
							disabled: true
						}
					]
				});
				// temp warning, can be removed down the line once BLPPROD is more established. Amalthea, May 2010.
				var boldtext = document.createElement('b');
				boldtext.appendChild(document.createTextNode('يرجى ملاحظة أنه فقط السير الذاتية غير الموثقة للشخصيات الحية مؤهلة لهذه العلامة، بتفسير ضيق.'));
				field.append({
					type: 'div',
					label: boldtext
				});
				break;

			default:
				break;
		}

		Twinkle.makeFindSourcesDiv('#twinkle-prod-findsources');

		event.target.form.replaceChild(field.render(), $(event.target.form).find('fieldset[name="parameters"]')[0]);
	};

	// global params object, initially set in evaluate(), and
	// modified in various callback functions
	let params = {};

	Twinkle.prod.callbacks = {
		checkPriors: function twinkleprodcheckPriors() {
			const talk_title = new mw.Title(mw.config.get('wgPageName')).getTalkPage().getPrefixedText();
			// Talk page templates for PROD-able discussions
			const blocking_templates = 'Template:Old XfD multi|Template:Old MfD|Template:Oldffdfull|' + // Common prior XfD talk page templates
				'Template:Oldpuffull|' + // Legacy prior XfD template
				'Template:Olddelrev|' + // Prior DRV template
				'Template:Old prod';
			const query = {
				action: 'query',
				titles: talk_title,
				prop: 'templates',
				tltemplates: blocking_templates,
				format: 'json'
			};

			const wikipedia_api = new Morebits.wiki.Api('التحقق من صفحة النقاش بحثًا عن ترشيحات سابقة', query);
			return wikipedia_api.post().then((apiobj) => {
				const statelem = apiobj.statelem;

				// Check talk page for templates indicating prior XfD or PROD
				const templates = apiobj.getResponse().query.pages[0].templates;
				const numTemplates = templates && templates.length;
				if (numTemplates) {
					const template = templates[0].title;
					if (numTemplates === 1 && template === 'Template:Old prod') {
						params.oldProdPresent = true; // Mark for reference later, when deciding if to endorse
						// if there are multiple templates, at least one of them would be a prior xfd template
					} else {
						statelem.warn('عُثر على قالب XfD سابق في صفحة النقاش، أُلغي الإجراء');
						return $.Deferred().reject();
					}
				}
			});
		},

		fetchCreationInfo: function twinkleprodFetchCreationInfo() {
			const def = $.Deferred();
			const ts = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'البحث عن مُنشئ الصفحة');
			ts.setFollowRedirect(true); // for NPP, and also because redirects are ineligible for PROD
			ts.setLookupNonRedirectCreator(true); // Look for author of first non-redirect revision
			ts.lookupCreation((pageobj) => {
				params.initialContrib = pageobj.getCreator();
				params.creation = pageobj.getCreationTimestamp();
				pageobj.getStatusElement().info('تم، عُثر على ' + params.initialContrib);
				def.resolve();
			}, def.reject);
			return def;
		},

		taggingPage: function twinkleprodTaggingPage() {
			const def = $.Deferred();

			const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم الصفحة');
			wikipedia_page.setFollowRedirect(true); // for NPP, and also because redirects are ineligible for PROD
			wikipedia_page.load((pageobj) => {
				const statelem = pageobj.getStatusElement();

				if (!pageobj.exists()) {
					statelem.error("يبدو أن الصفحة غير موجودة. ربما تم حذفه بالفعل.");
					// reject, so that all dependent actions like notifyAuthor() and
					// addToLog() are cancelled
					return def.reject();
				}

				let text = pageobj.getPageText();

				// Check for already existing deletion tags
				const tag_re = /{{(?:article for deletion\/dated|AfDM|ffd\b)|#invoke:RfD/i;
				if (tag_re.test(text)) {
					statelem.warn('الصفحة موسومة بالفعل بقالب حذف، أُلغي الإجراء');
					return def.reject();
				}

				// Remove tags that become superfluous with this action
				text = text.replace(/{{\s*(userspace draft|mtc|(copy|move) to wikimedia commons|(copy |move )?to ?commons)\s*(\|(?:{{[^{}]*}}|[^{}])*)?}}\s*/gi, '');
				const prod_re = /{{\s*(?:Prod blp|Proposed deletion)\/dated(?: files)?\s*\|(?:{{[^{}]*}}|[^{}])*}}/i;
				let summaryText;

				if (!prod_re.test(text)) {

					// Page previously PROD-ed
					if (params.oldProdPresent) {
						if (params.blp) {
							if (!confirm('عُثر على ترشيح PROD سابق في صفحة النقاش. هل ما زلت ترغب في متابعة تطبيق BLPPROD؟')) {
								statelem.warn('عُثر على PROD سابق في صفحة النقاش، وتم إحباطه من قبل المستخدم');
								return def.reject();
							}
							statelem.info('عُثر على PROD سابق في صفحة النقاش، ويستمر');
						} else {
							statelem.warn('عُثر على PROD سابق في صفحة النقاش، أُلغي الإجراء');
							return def.reject();
						}
					}

					let tag;
					if (params.blp) {
						summaryText = 'اقتراح حذف المقالة لكل [[WP:BLPPROD]].';
						tag = '{{subst:prod blp' + (params.usertalk ? '|help=off' : '') + '}}';
					} else {
						summaryText = 'اقتراح حذف ' + namespace + ' لكل [[WP:PROD]].';
						tag = '{{subst:prod|1=' + Morebits.string.formatReasonText(params.reason) + (params.usertalk ? '|help=off' : '') + '}}';
					}

					// Insert tag after short description or any hatnotes
					const wikipage = new Morebits.wikitext.Page(text);
					text = wikipage.insertAfterTemplates(tag + '\n', Twinkle.hatnoteRegex).getText();

				} else { // already tagged for PROD, so try endorsing it
					const prod2_re = /{{(?:Proposed deletion endorsed|prod-?2).*?}}/i;
					if (prod2_re.test(text)) {
						statelem.warn('الصفحة موسومة بالفعل بقالبي {{proposed deletion}} و {{proposed deletion endorsed}}، أُلغي الإجراء');
						return def.reject();
					}
					let confirmtext = 'تحتوي هذه الصفحة بالفعل على علامة {{proposed deletion}} في هذه الصفحة. \nهل ترغب في إضافة علامة {{proposed deletion endorsed}} مع شرحك؟';
					if (params.blp && !/{{\s*Prod blp\/dated/.test(text)) {
						confirmtext = 'عُثر على علامة {{proposed deletion}} غير خاصة بـ BLP في هذه المقالة.\nهل ترغب في إضافة علامة {{proposed deletion endorsed}} مع شرح "المقالة عبارة عن سيرة ذاتية لشخص حي بدون مصادر"؟';
					}
					if (!confirm(confirmtext)) {
						statelem.warn('تم الإلغاء بناءً على طلب المستخدم');
						return def.reject();
					}

					summaryText = 'تأييد الحذف المقترح لكل [[WP:' + (params.blp ? 'BLP' : '') + 'PROD]].';
					text = text.replace(prod_re, text.match(prod_re) + '\n{{Proposed deletion endorsed|1=' + (params.blp ?
						'المقالة عبارة عن [[WP:BLPPROD|سيرة ذاتية لشخص حي بدون مصادر]]' :
						Morebits.string.formatReasonText(params.reason)) + '}}\n');

					params.logEndorsing = true;
				}

				// curate/patrol the page
				if (Twinkle.getPref('markProdPagesAsPatrolled')) {
					pageobj.triage();
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary(summaryText);
				pageobj.setChangeTags(Twinkle.changeTags);
				pageobj.setWatchlist(Twinkle.getPref('watchProdPages'));
				pageobj.setCreateOption('nocreate');
				pageobj.save(def.resolve, def.reject);

			}, def.reject);
			return def;
		},

		addOldProd: function twinkleprodAddOldProd() {
			const def = $.Deferred();

			if (params.oldProdPresent || params.blp) {
				return def.resolve();
			}

			// Add {{Old prod}} to the talk page
			const oldprodfull = '{{Old prod|nom=' + mw.config.get('wgUserName') + '|nomdate={{subst:#time: Y-m-d}}}}\n';
			const talktitle = new mw.Title(mw.config.get('wgPageName')).getTalkPage().getPrefixedText();
			const talkpage = new Morebits.wiki.Page(talktitle, 'وضع {{Old prod}} في صفحة النقاش');
			talkpage.setPrependText(oldprodfull);
			talkpage.setEditSummary('إضافة {{Old prod}}');
			talkpage.setChangeTags(Twinkle.changeTags);
			talkpage.setFollowRedirect(true); // match behavior for page tagging
			talkpage.setCreateOption('recreate');
			talkpage.prepend(def.resolve, def.reject);
			return def;
		},

		notifyAuthor: function twinkleprodNotifyAuthor() {
			const def = $.Deferred();

			if (!params.blp && !params.usertalk) {
				return def.resolve();
			}

			// Disallow warning yourself
			if (params.initialContrib === mw.config.get('wgUserName')) {
				Morebits.Status.info('إعلام المنشئ', 'أنت (' + params.initialContrib + ') من أنشأ هذه الصفحة؛ تخطي إشعار المستخدم');
				return def.resolve();
			}
			// [[Template:Proposed deletion notify]] supports File namespace
			let notifyTemplate;
			if (params.blp) {
				notifyTemplate = 'prodwarningBLP';
			} else {
				notifyTemplate = 'proposed deletion notify';
			}
			const notifytext = '\n{{subst:' + notifyTemplate + '|1=' + Morebits.pageNameNorm + '|concern=' + params.reason + '}} ~~~~';

			const usertalkpage = new Morebits.wiki.Page('User talk:' + params.initialContrib, 'إعلام المساهم الأولي (' + params.initialContrib + ')');
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary('إشعار: الحذف المقترح لـ [[:' + Morebits.pageNameNorm + ']].');
			usertalkpage.setChangeTags(Twinkle.changeTags);
			usertalkpage.setCreateOption('recreate');
			usertalkpage.setFollowRedirect(true, false);
			usertalkpage.append(() => {
				// add nomination to the userspace log, if the user has enabled it
				params.logInitialContrib = params.initialContrib;
				def.resolve();
			}, def.resolve); // resolves even if notification was unsuccessful

			return def;
		},

		addToLog: function twinkleprodAddToLog() {
			if (!Twinkle.getPref('logProdPages')) {
				return $.Deferred().resolve();
			}
			const usl = new Morebits.UserspaceLogger(Twinkle.getPref('prodLogPageName'));
			usl.initialText =
				"هذا سجل لجميع علامات [[WP:PROD|الحذف المقترح]] التي طُبقت أو تأييدها من قبل هذا المستخدم باستخدام وحدة PROD الخاصة بـ [[WP:TW|Twinkle]].\n\n" +
				'إذا لم تعد ترغب في الاحتفاظ بهذا السجل، فيمكنك إيقاف تشغيله باستخدام [[ويكيبيديا:Twinkle/Preferences|لوحة التفضيلات]] ، وترشيح هذه الصفحة للحذف السريع بموجب [[WP:CSD#U1|CSD U1]].';

			let logText = '# [[:' + Morebits.pageNameNorm + ']]';
			let summaryText;
			// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
			logText += namespace === 'file' ? ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} سجل]): ' : ': ';
			if (params.logEndorsing) {
				logText += 'تأييد ' + (params.blp ? 'BLP ' : '') + 'PROD. ~~~~~';
				if (params.reason) {
					logText += "\n#* '''السبب''': " + params.reason + '\n';
				}
				summaryText = 'تسجيل تأييد ترشيح PROD لـ [[:' + Morebits.pageNameNorm + ']].';
			} else {
				logText += (params.blp ? 'BLP ' : '') + 'PROD';
				if (params.logInitialContrib) {
					logText += '; تم إعلام {{user|' + params.logInitialContrib + '}}';
				}
				logText += ' ~~~~~\n';
				if (!params.blp && params.reason) {
					logText += "#* '''السبب''': " + Morebits.string.formatReasonForLog(params.reason) + '\n';
				}
				summaryText = 'تسجيل ترشيح PROD لـ [[:' + Morebits.pageNameNorm + ']].';
			}
			usl.changeTags = Twinkle.changeTags;

			return usl.log(logText, summaryText);
		}

	};

	Twinkle.prod.callback.evaluate = function twinkleprodCallbackEvaluate(e) {
		const form = e.target;
		const input = Morebits.QuickForm.getInputData(form);

		params = {
			usertalk: input.notify || input.prodtype === 'prodblp',
			blp: input.prodtype === 'prodblp',
			reason: input.reason || '' // using an empty string here as fallback will help with prod-2.
		};

		if (!params.blp && !params.reason) {
			if (!confirm('تركت السبب فارغًا، هل تريد حقًا المتابعة بدون تقديم سبب؟')) {
				return;
			}
		}

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		const tm = new Morebits.TaskManager();
		const cbs = Twinkle.prod.callbacks; // shortcut reference, cbs for `callbacks`

		// Disable Morebits.wiki.numberOfActionsLeft system
		Morebits.wiki.numberOfActionsLeft = 1000;

		// checkPriors() and fetchCreationInfo() have no dependencies, they'll run first
		tm.add(cbs.checkPriors, []);
		tm.add(cbs.fetchCreationInfo, []);
		// tag the page once we're clear of the pre-requisites
		tm.add(cbs.taggingPage, [cbs.checkPriors, cbs.fetchCreationInfo]);
		// notify the author once we know who's the author, and also wait for the
		// taggingPage() as we don't need to notify if tagging was not done, such as
		// there was already a tag and the user chose not to endorse.
		tm.add(cbs.notifyAuthor, [cbs.fetchCreationInfo, cbs.taggingPage]);
		// oldProd needs to be added only if there wasn't one before, so need to wait
		// for checkPriors() to finish. Also don't add oldProd if tagging itself was
		// aborted or unsuccessful
		tm.add(cbs.addOldProd, [cbs.taggingPage, cbs.checkPriors]);
		// add to log only after notifying author so that the logging can be adjusted if
		// notification wasn't successful. Also, don't run if tagging was not done.
		tm.add(cbs.addToLog, [cbs.notifyAuthor, cbs.taggingPage]);
		// All set, go!
		tm.execute().then(() => {
			Morebits.Status.actionCompleted('اكتمل الوسم');
			setTimeout(() => {
				window.location.href = mw.util.getUrl(mw.config.get('wgPageName'));
			}, Morebits.wiki.actionCompleted.timeOut);
		});
	};

	Twinkle.addInitCallback(Twinkle.prod, 'prod');
}());

// </nowiki>
