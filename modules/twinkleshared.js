// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleshared.js: Shared IP tagging module
	 ****************************************
	 * Mode of invocation:     Tab ("Shared")
	 * Active on:              IP user talk pages
	 */

	Twinkle.shared = function twinkleshared() {
		if (mw.config.get('wgNamespaceNumber') === 3 && mw.util.isIPAddress(mw.config.get('wgTitle'))) {
			const username = mw.config.get('wgRelevantUserName');
			Twinkle.addPortletLink(() => {
				Twinkle.shared.callback(username);
			}, 'IP مشترك', 'twinkle-shared', 'وسم IP المشترك');
		}
	};

	Twinkle.shared.callback = function twinklesharedCallback() {
		const Window = new Morebits.SimpleWindow(600, 450);
		Window.setTitle('وسم عنوان IP المشترك');
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('تفضيلات المشترك', 'WP:TW/PREF#shared');
		Window.addFooterLink('مساعدة لمح البصر!', 'WP:TW/DOC#shared');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.shared.callback.evaluate);

		const div = form.append({
			type: 'div',
			id: 'sharedip-templatelist',
			className: 'morebits-scrollbox'
		}
		);
		div.append({ type: 'header', label: 'قوالب عناوين IP المشتركة' });
		div.append({
			type: 'radio', name: 'template', list: Twinkle.shared.standardList,
			event: function (e) {
				Twinkle.shared.callback.change_shared(e);
				e.stopPropagation();
			}
		});

		const org = form.append({ type: 'field', label: 'املأ التفاصيل الأخرى (اختياري) وانقر على "إرسال"' });
		org.append({
			type: 'input',
			name: 'organization',
			label: 'مالك/مشغل عنوان IP',
			disabled: true,
			tooltip: 'يمكنك اختياريًا إدخال اسم المؤسسة التي تمتلك/تشغل عنوان IP. يمكنك استخدام ترميز الويكي إذا لزم الأمر.'
		}
		);
		org.append({
			type: 'input',
			name: 'host',
			label: 'اسم المضيف (اختياري)',
			disabled: true,
			tooltip: 'يمكن إدخال اسم المضيف (على سبيل المثال، proxy.example.com) اختياريًا هنا وسيتم ربطه بواسطة القالب.'
		}
		);
		org.append({
			type: 'input',
			name: 'contact',
			label: 'معلومات الاتصال (فقط إذا طُلب ذلك)',
			disabled: true,
			tooltip: 'يمكنك اختياريًا إدخال بعض تفاصيل الاتصال للمؤسسة. استخدم هذه المعلمة فقط إذا طلبت المنظمة تحديدًا إضافتها. يمكنك استخدام ترميز الويكي إذا لزم الأمر.'
		}
		);

		const previewlink = document.createElement('a');
		$(previewlink).on('click', () => {
			Twinkle.shared.preview(result);
		});
		previewlink.style.cursor = 'pointer';
		previewlink.textContent = 'معاينة';
		form.append({ type: 'div', id: 'sharedpreview', label: [previewlink] });
		form.append({ type: 'submit' });

		var result = form.render();
		Window.setContent(result);
		Window.display();
	};

	Twinkle.shared.standardList = [
		{
			label: '{{Shared IP}}: قالب عنوان IP المشترك القياسي',
			value: 'Shared IP',
			tooltip: 'قالب صفحة نقاش مستخدم IP يعرض معلومات مفيدة لمستخدمي IP وأولئك الذين يرغبون في تحذيرهم أو منعهم أو منعهم'
		},
		{
			label: '{{Shared IP edu}}: قالب عنوان IP مشترك مُعدَّل للمؤسسات التعليمية',
			value: 'Shared IP edu'
		},
		{
			label: '{{Shared IP corp}}: قالب عنوان IP مشترك مُعدَّل للشركات',
			value: 'Shared IP corp'
		},
		{
			label: '{{Shared IP public}}: قالب عنوان IP مشترك مُعدَّل للمحطات العامة',
			value: 'Shared IP public'
		},
		{
			label: '{{Shared IP gov}}: قالب عنوان IP مشترك مُعدَّل للوكالات أو المرافق الحكومية',
			value: 'Shared IP gov'
		},
		{
			label: '{{Dynamic IP}}: قالب عنوان IP مشترك مُعدَّل للمؤسسات ذات العنونة الديناميكية',
			value: 'Dynamic IP'
		},
		{
			label: '{{Static IP}}: قالب عنوان IP مشترك مُعدَّل لعناوين IP الثابتة',
			value: 'Static IP'
		},
		{
			label: '{{ISP}}: قالب عنوان IP مشترك مُعدَّل لمؤسسات مزود خدمة الإنترنت (وكلاء على وجه التحديد)',
			value: 'ISP'
		},
		{
			label: '{{Mobile IP}}: قالب عنوان IP مشترك مُعدَّل لشركات الهاتف المحمول وعملائها',
			value: 'Mobile IP'
		},
		{
			label: '{{Whois}}: قالب لعناوين IP التي تحتاج إلى مراقبة، ولكن من غير المعروف ما إذا كانت ثابتة أو ديناميكية أو مشتركة',
			value: 'Whois'
		}
	];
	Twinkle.shared.callback.change_shared = function twinklesharedCallbackChangeShared(e) {
		e.target.form.contact.disabled = e.target.value !== 'Shared IP edu'; // only supported by {{Shared IP edu}}
		e.target.form.organization.disabled = false;
		e.target.form.host.disabled = e.target.value === 'Whois'; // host= not supported by {{Whois}}
	};

	Twinkle.shared.callbacks = {
		main: function (pageobj) {
			const params = pageobj.getCallbackParameters();
			const pageText = pageobj.getPageText();
			let found = false;

			for (let i = 0; i < Twinkle.shared.standardList.length; i++) {
				const tagRe = new RegExp('(\\{\\{' + Twinkle.shared.standardList[i].value + '(\\||\\}\\}))', 'im');
				if (tagRe.exec(pageText)) {
					Morebits.Status.warn('معلومات', 'عُثر على {{' + Twinkle.shared.standardList[i].value + '}} في صفحة نقاش المستخدم بالفعل... أُلغي الطلب');
					found = true;
				}
			}

			if (found) {
				return;
			}

			Morebits.Status.info('معلومات', 'سيتم إضافة قالب عنوان IP المشترك في الجزء العلوي من صفحة نقاش المستخدم.');
			const text = Twinkle.shared.getTemplateWikitext(params);

			const summaryText = 'تمت إضافة قالب {{[[Template:' + params.template + '|' + params.template + ']]}}.';
			pageobj.setPageText(text + pageText);
			pageobj.setEditSummary(summaryText);
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setMinorEdit(Twinkle.getPref('markSharedIPAsMinor'));
			pageobj.setCreateOption('recreate');
			pageobj.save();
		}
	};

	Twinkle.shared.preview = function (form) {
		const input = Morebits.QuickForm.getInputData(form);
		if (input.template) {
			const previewDialog = new Morebits.SimpleWindow(700, 500);
			previewDialog.setTitle('معاينة قالب IP المشترك');
			previewDialog.setScriptName('إضافة قالب IP المشترك');
			previewDialog.setModality(true);

			const previewdiv = document.createElement('div');
			previewdiv.style.marginLeft = previewdiv.style.marginRight = '0.5em';
			previewdiv.style.fontSize = 'small';
			previewDialog.setContent(previewdiv);

			const previewer = new Morebits.wiki.Preview(previewdiv);
			previewer.beginRender(Twinkle.shared.getTemplateWikitext(input), mw.config.get('wgPageName'));

			const submit = document.createElement('input');
			submit.setAttribute('type', 'submit');
			submit.setAttribute('value', 'إغلاق');
			previewDialog.addContent(submit);

			previewDialog.display();

			$(submit).on('click', () => {
				previewDialog.close();
			});
		}
	};

	Twinkle.shared.getTemplateWikitext = function (input) {
		let text = '{{' + input.template + '|' + input.organization;
		if (input.contact) {
			text += '|' + input.contact;
		}
		if (input.host) {
			text += '|host=' + input.host;
		}
		text += '}}\n\n';
		return text;
	};

	Twinkle.shared.callback.evaluate = function twinklesharedCallbackEvaluate(e) {
		const params = Morebits.QuickForm.getInputData(e.target);
		if (!params.template) {
			alert('يجب عليك تحديد قالب عنوان IP المشترك لاستخدامه!');
			return;
		}
		if (!params.organization) {
			alert('يجب عليك إدخال مؤسسة لقالب {{' + params.template + '}}!');
			return;
		}

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(e.target);

		Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
		Morebits.wiki.actionCompleted.notice = 'اكتمل الوسم، وإعادة تحميل صفحة النقاش في بضع ثوان';

		const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'تعديل صفحة نقاش المستخدم');
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.shared.callbacks.main);
	};

	Twinkle.addInitCallback(Twinkle.shared, 'shared');
}());

// </nowiki>
