// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleimage.js: Image CSD module
	 ****************************************
	 * Mode of invocation:     Tab ("DI")
	 * Active on:              Local nonredirect file pages (not on Commons) - Only file pages that exist locally; Files that exist on Commons do not trigger this module.
	 */

	Twinkle.image = function twinkleimage() {
		if (mw.config.get('wgNamespaceNumber') === 6 && mw.config.get('wgArticleId') && !document.getElementById('mw-sharedupload') && !Morebits.isPageRedirect()) {
			Twinkle.addPortletLink(Twinkle.image.callback, 'DI', 'tw-di', 'ترشيح الملف للحذف السريع المؤجل');
		}
	};

	Twinkle.image.callback = function twinkleimageCallback() {
		const Window = new Morebits.SimpleWindow(600, 330);
		Window.setTitle('ملف للحذف السريع المؤرخ');
		Window.setScriptName('Twinkle');
		Window.addFooterLink('سياسة الحذف السريع', 'WP:CSD#Files');
		Window.addFooterLink('تفضيلات الصورة', 'WP:TW/PREF#image');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#image');
		Window.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(Twinkle.image.callback.evaluate);
		form.append({
			type: 'checkbox',
			list: [
				{
					label: 'إعلام الرافع الأصلي',
					value: 'notify',
					name: 'notify',
					tooltip: "قم بإلغاء تحديد هذا إذا كنت تخطط لتقديم ترشيحات متعددة من نفس المستخدم ، ولا تريد إثقال صفحة نقاشهم بالكثير من الإشعارات.",
					checked: Twinkle.getPref('notifyUserOnDeli')
				}
			]
		}
		);
		const field = form.append({
			type: 'field',
			label: 'نوع الإجراء المطلوب'
		});
		field.append({
			type: 'radio',
			name: 'type',
			event: Twinkle.image.callback.choice,
			list: [
				{
					label: 'لا يوجد مصدر (CSD F4)',
					value: 'no source',
					checked: true,
					tooltip: 'الصورة أو الوسائط ليس لديها معلومات المصدر'
				},
				{
					label: 'لا يوجد ترخيص (CSD F4)',
					value: 'no license',
					tooltip: 'الصورة أو الوسائط ليس لديها معلومات حول حالة حقوق النشر الخاصة بها'
				},
				{
					label: 'لا يوجد مصدر ولا يوجد ترخيص (CSD F4)',
					value: 'no source no license',
					tooltip: 'الصورة أو الوسائط لا تملك معلومات عن المصدر ولا عن حالة حقوق النشر الخاصة بها'
				},
				{
					label: 'استخدام غير حر يتيم (CSD F5)',
					value: 'orphaned non-free use',
					tooltip: 'الصورة أو الوسائط غير مرخصة للاستخدام في ويكيبيديا ومسموح بها فقط بموجب ادعاء الاستخدام العادل وفقًا لـ ويكيبيديا:محتوى غير حر ، ولكنها غير مستخدمة في أي مقالات'
				},
				{
					label: 'لا يوجد أساس منطقي للاستخدام غير الحر (CSD F6)',
					value: 'no non-free use rationale',
					tooltip: 'يُزعم أن الصورة أو الوسائط تستخدم بموجب سياسة الاستخدام العادل لويكيبيديا ولكن ليس لديها تفسير لسبب السماح بها بموجب السياسة'
				},
				{
					label: 'أساس منطقي للاستخدام غير الحر المتنازع عليه (CSD F7)',
					value: 'disputed non-free use rationale',
					tooltip: 'تحتوي الصورة أو الوسائط على أساس منطقي للاستخدام العادل يتم التنازع عليه أو غير صالح ، مثل علامة {{Non-free logo}} على صورة فوتوغرافية لتميمة'
				},
				{
					label: 'استخدام غير حر قابل للاستبدال (CSD F7)',
					value: 'replaceable non-free use',
					tooltip: 'قد تفشل الصورة أو الوسائط في معيار المحتوى غير الحر الأول لويكيبيديا ([[WP:NFCC#1]]) من حيث أنها توضح موضوعًا يمكن العثور فيه بشكل معقول على صورة مجانية أو إنشاؤها والتي توفر بشكل كافٍ نفس المعلومات'
				},
				{
					label: 'لا يوجد دليل على الإذن (CSD F11)',
					value: 'no permission',
					tooltip: 'الصورة أو الوسائط ليس لديها دليل على أن المؤلف وافق على ترخيص الملف'
				}
			]
		});
		form.append({
			type: 'div',
			label: 'منطقة العمل',
			name: 'work_area'
		});
		form.append({ type: 'submit' });

		const result = form.render();
		Window.setContent(result);
		Window.display();

		// We must init the parameters
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.type[0].dispatchEvent(evt);
	};
	Twinkle.image.callback.choice = function twinkleimageCallbackChoose(event) {
		const value = event.target.values;
		const root = event.target.form;
		const work_area = new Morebits.QuickForm.Element({
			type: 'div',
			name: 'work_area'
		});

		switch (value) {
			case 'no source no license':
			case 'no source':
				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'غير حر',
							name: 'non_free',
							tooltip: 'الملف مرخص بموجب مطالبة الاستخدام العادل'
						}
					]
				});
			/* falls through */
			case 'no license':
				work_area.append({
					type: 'checkbox',
					list: [
						{
							name: 'derivative',
							label: 'عمل مشتق يفتقر إلى مصدر للأعمال المدمجة',
							tooltip: 'الملف هو مشتق من عمل واحد أو أكثر لم يتم تحديد مصدره'
						}
					]
				});
				break;
			case 'no permission':
				work_area.append({
					type: 'input',
					name: 'source',
					label: 'المصدر:'
				});
				break;
			case 'disputed non-free use rationale':
				work_area.append({
					type: 'textarea',
					name: 'reason',
					label: 'السبب:',
				});
				break;
			case 'orphaned non-free use':
				work_area.append({
					type: 'input',
					name: 'replacement',
					label: 'الاستبدال:',
					tooltip: 'ملف اختياري يحل محل هذا الملف. البادئة "File:" اختيارية.'
				});
				break;
			case 'replaceable non-free use':
				work_area.append({
					type: 'textarea',
					name: 'reason',
					label: 'السبب:',
				});
				break;
			default:
				break;
		}

		root.replaceChild(work_area.render(), $(root).find('div[name="work_area"]')[0]);
	};

	Twinkle.image.callback.evaluate = function twinkleimageCallbackEvaluate(event) {

		const input = Morebits.QuickForm.getInputData(event.target);
		if (input.replacement) {
			input.replacement = (new RegExp('^' + Morebits.namespaceRegex(6) + ':', 'i').test(input.replacement) ? '' : 'File:') + input.replacement;
		}

		let csdcrit;
		switch (input.type) {
			case 'no source no license':
			case 'no source':
			case 'no license':
				csdcrit = 'F4';
				break;
			case 'orphaned non-free use':
				csdcrit = 'F5';
				break;
			case 'no non-free use rationale':
				csdcrit = 'F6';
				break;
			case 'disputed non-free use rationale':
			case 'replaceable non-free use':
				csdcrit = 'F7';
				break;
			case 'no permission':
				csdcrit = 'F11';
				break;
			default:
				throw new Error('Twinkle.image.callback.evaluate: unknown criterion');
		}

		const lognomination = Twinkle.getPref('logSpeedyNominations') && !Twinkle.getPref('noLogOnSpeedyNomination').includes(csdcrit.toLowerCase());
		const templatename = input.derivative ? 'dw ' + input.type : input.type;

		const params = $.extend({
			templatename: templatename,
			normalized: csdcrit,
			lognomination: lognomination
		}, input);

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(event.target);

		Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
		Morebits.wiki.actionCompleted.notice = 'اكتمل الوسم';

		// Tagging image
		const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وسم الملف بعلامة الحذف');
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.image.callbacks.taggingImage);

		// Notifying uploader
		if (input.notify) {
			wikipedia_page.lookupCreation(Twinkle.image.callbacks.userNotification);
		} else {
			// add to CSD log if desired
			if (lognomination) {
				Twinkle.image.callbacks.addToLog(params, null);
			}
			// No auto-notification, display what was going to be added.
			const noteData = document.createElement('pre');
			noteData.appendChild(document.createTextNode('{{subst:di-' + templatename + '-notice|1=' + mw.config.get('wgTitle') + '}} ~~~~'));
			Morebits.Status.info('إعلام', ['يجب نشر البيانات التالية/المشابهة على الرافع الأصلي:', document.createElement('br'), noteData]);
		}
	};

	Twinkle.image.callbacks = {
		taggingImage: function (pageobj) {
			let text = pageobj.getPageText();
			const params = pageobj.getCallbackParameters();

			// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
			text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');

			let tag = '{{di-' + params.templatename + '|date={{subst:#time:j F Y}}';
			switch (params.type) {
				case 'no source no license':
				case 'no source':
					tag += params.non_free ? '|non-free=yes' : '';
					break;
				case 'no permission':
					tag += params.source ? '|source=' + params.source : '';
					break;
				case 'disputed non-free use rationale':
					tag += params.reason ? '|concern=' + params.reason : '';
					break;
				case 'orphaned non-free use':
					tag += params.replacement ? '|replacement=' + params.replacement : '';
					break;
				case 'replaceable non-free use':
					tag += params.reason ? '|1=' + params.reason : '';
					break;
				default:
					break; // doesn't matter
			}
			tag += '|help=off}}\n';

			pageobj.setPageText(tag + text);
			pageobj.setEditSummary('هذا الملف مُرشح للحذف، حسب [[WP:CSD#' + params.normalized + '|CSD ' + params.normalized + ']] (' + params.type + ').');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('deliWatchPage'));
			pageobj.setCreateOption('nocreate');
			pageobj.save();
		},
		userNotification: function (pageobj) {
			const params = pageobj.getCallbackParameters();
			const initialContrib = pageobj.getCreator();

			// disallow warning yourself
			if (initialContrib === mw.config.get('wgUserName')) {
				pageobj.getStatusElement().warn('أنت (' + initialContrib + ') من أنشأ هذه الصفحة؛ تخطي إشعار المستخدم');
			} else {
				const usertalkpage = new Morebits.wiki.Page('User talk:' + initialContrib, 'إعلام المساهم الأولي (' + initialContrib + ')');
				let notifytext = '\n{{subst:di-' + params.templatename + '-notice|1=' + mw.config.get('wgTitle');
				if (params.type === 'no permission') {
					notifytext += params.source ? '|source=' + params.source : '';
				}
				notifytext += '}} ~~~~';
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary('إشعار: وسم للحذف لـ [[:' + Morebits.pageNameNorm + ']].');
				usertalkpage.setChangeTags(Twinkle.changeTags);
				usertalkpage.setCreateOption('recreate');
				usertalkpage.setWatchlist(Twinkle.getPref('deliWatchUser'));
				usertalkpage.setFollowRedirect(true, false);
				usertalkpage.append();
			}

			// add this nomination to the user's userspace log, if the user has enabled it
			if (params.lognomination) {
				Twinkle.image.callbacks.addToLog(params, initialContrib);
			}
		},
		addToLog: function (params, initialContrib) {
			const usl = new Morebits.UserspaceLogger(Twinkle.getPref('speedyLogPageName'));
			usl.initialText =
				"هذا سجل لجميع ترشيحات [[WP:CSD|الحذف السريع]] التي قام بها هذا المستخدم باستخدام وحدة CSD الخاصة بـ [[WP:TW|Twinkle]].\n\n" +
				'إذا لم تعد ترغب في الاحتفاظ بهذا السجل ، فيمكنك إيقاف تشغيله باستخدام [[Wikipedia:Twinkle/Preferences|لوحة التفضيلات]] ، وترشيح هذه الصفحة للحذف السريع بموجب [[WP:CSD#U1|CSD U1]].' +
				(Morebits.userIsSysop ? '\n\nلا يتتبع هذا السجل عمليات الحذف السريع الصريح التي تتم باستخدام Twinkle.' : '');

			const formatParamLog = function (normalize, csdparam, input) {
				if (normalize === 'F5' && csdparam === 'replacement') {
					input = '[[:' + input + ']]';
				}
				return ' {' + normalize + ' ' + csdparam + ': ' + input + '}';
			};

			let extraInfo = '';

			// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
			const fileLogLink = ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} سجل])';

			let appendText = '# [[:' + Morebits.pageNameNorm + ']]' + fileLogLink + ': DI [[WP:CSD#' + params.normalized.toUpperCase() + '|CSD ' + params.normalized.toUpperCase() + ']] ({{tl|di-' + params.templatename + '}})';

			['reason', 'replacement', 'source'].forEach((item) => {
				if (params[item]) {
					extraInfo += formatParamLog(params.normalized.toUpperCase(), item, params[item]);
					return false;
				}
			});

			if (extraInfo) {
				appendText += '; معلومات إضافية:' + extraInfo;
			}
			if (initialContrib) {
				appendText += '; تم إعلام {{user|1=' + initialContrib + '}}';
			}
			appendText += ' ~~~~~\n';

			const editsummary = 'تسجيل ترشيح الحذف السريع لـ [[:' + Morebits.pageNameNorm + ']].';

			usl.changeTags = Twinkle.changeTags;
			usl.log(appendText, editsummary);
		}
	};

	Twinkle.addInitCallback(Twinkle.image, 'image');
}());

// </nowiki>
