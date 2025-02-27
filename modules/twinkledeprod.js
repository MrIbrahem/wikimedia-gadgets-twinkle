// <nowiki>

(function () {

	/*
	****************************************
	*** twinkledeprod.js: Batch deletion of expired PRODs (sysops only)
	****************************************
	* Mode of invocation:     Tab ("Deprod")
	* Active on:              Categories whose name contains "proposed_deletion"
	*/

	Twinkle.deprod = function () {
		if (
			!Morebits.userIsSysop ||
			mw.config.get('wgNamespaceNumber') !== 14 ||
			!(/proposed_deletion/i).test(mw.config.get('wgPageName'))
		) {
			return;
		}
		Twinkle.addPortletLink(Twinkle.deprod.callback, 'Deprod', 'tw-deprod', 'حذف صفحات prod الموجودة في هذه الفئة');
	};

	const concerns = {};

	Twinkle.deprod.callback = function () {
		const Window = new Morebits.SimpleWindow(800, 400);
		Window.setTitle('تنظيف PROD');
		Window.setScriptName('Twinkle');
		Window.addFooterLink('الحذف المقترح', 'WP:PROD');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#deprod');
		Window.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(callback_commit);

		const statusdiv = document.createElement('div');
		statusdiv.style.padding = '15px'; // just so it doesn't look broken
		Window.setContent(statusdiv);
		Morebits.Status.init(statusdiv);
		Window.display();

		const query = {
			action: 'query',
			generator: 'categorymembers',
			gcmtitle: mw.config.get('wgPageName'),
			gcmlimit: Twinkle.getPref('batchMax'),
			gcmnamespace: '0|2', // only display articles or user pages
			prop: 'info|revisions',
			rvprop: 'content',
			inprop: 'protection',
			format: 'json'
		};

		const statelem = new Morebits.Status('جلب قائمة الصفحات');
		const wikipedia_api = new Morebits.wiki.Api('loading...', query, ((apiobj) => {
			const response = apiobj.getResponse();
			const pages = (response.query && response.query.pages) || [];
			const list = [];
			const re = /\{\{Proposed deletion/;
			pages.sort(Twinkle.sortByNamespace);
			pages.forEach((page) => {
				const metadata = [];

				const content = page.revisions[0].content;
				const res = re.exec(content);
				const title = page.title;
				if (res) {
					const parsed = Morebits.wikitext.parseTemplate(content, res.index);
					concerns[title] = parsed.parameters.concern || '';
					metadata.push(concerns[title]);
				}

				const editProt = page.protection.filter((pr) => pr.type === 'edit' && pr.level === 'sysop').pop();
				if (editProt) {
					metadata.push('محمي بالكامل' +
						(editProt.expiry === 'infinity' ? ' إلى أجل غير مسمى' : '، تنتهي صلاحيته ' + editProt.expiry));
				}

				list.push({
					label: metadata.length ? '(' + metadata.join('; ') + ')' : '',
					value: title,
					checked: concerns[title] !== '',
					style: editProt ? 'color:red' : ''
				});
			});
			apiobj.params.form.append({ type: 'header', label: 'الصفحات المراد حذفها' });
			apiobj.params.form.append({
				type: 'button',
				label: 'تحديد الكل',
				event: function (e) {
					$(Morebits.QuickForm.getElements(e.target.form, 'pages')).prop('checked', true);
				}
			});
			apiobj.params.form.append({
				type: 'button',
				label: 'إلغاء تحديد الكل',
				event: function (e) {
					$(Morebits.QuickForm.getElements(e.target.form, 'pages')).prop('checked', false);
				}
			});
			apiobj.params.form.append({
				type: 'checkbox',
				name: 'pages',
				list: list
			});
			apiobj.params.form.append({
				type: 'submit'
			});

			const rendered = apiobj.params.form.render();
			apiobj.params.Window.setContent(rendered);
			Morebits.QuickForm.getElements(rendered, 'pages').forEach(Twinkle.generateBatchPageLinks);
		}), statelem);

		wikipedia_api.params = { form: form, Window: Window };
		wikipedia_api.post();
	};

	var callback_commit = function (event) {
		const pages = Morebits.QuickForm.getInputData(event.target).pages;
		Morebits.Status.init(event.target);

		const batchOperation = new Morebits.BatchOperation('حذف الصفحات');
		batchOperation.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		batchOperation.setOption('preserveIndividualStatusLines', true);
		batchOperation.setPageList(pages);
		batchOperation.run((pageName) => {
			const params = { page: pageName, reason: concerns[page] };

			let query = {
				action: 'query',
				titles: pageName,
				prop: 'redirects',
				rdlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				format: 'json'
			};
			let wikipedia_api = new Morebits.wiki.Api('جلب عمليات التحويل', query, callback_deleteRedirects);
			wikipedia_api.params = params;
			wikipedia_api.post();

			const pageTitle = mw.Title.newFromText(pageName);
			// Don't delete user talk pages, limiting this to Talk: pages since only article and user pages appear in deprod
			if (pageTitle && pageTitle.namespace % 2 === 0 && pageTitle.namespace !== 2) {
				pageTitle.namespace++; // now pageTitle is the talk page title!
				query = {
					action: 'query',
					titles: pageTitle.toText(),
					format: 'json'
				};
				wikipedia_api = new Morebits.wiki.Api('التحقق مما إذا كانت ' + pageName + ' لديها صفحة نقاش', query,
					callback_deleteTalk);
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			var page = new Morebits.wiki.Page(pageName, 'حذف الصفحة ' + pageName);
			page.setEditSummary('منتهي الصلاحية [[WP:PROD|PROD]]، كان السبب: ' + concerns[pageName]);
			page.setChangeTags(Twinkle.changeTags);
			page.suppressProtectWarning();
			page.deletePage(batchOperation.workerSuccess, batchOperation.workerFailure);
		});
	},
		callback_deleteTalk = function (apiobj) {
			// no talk page; forget about it
			if (apiobj.getResponse().query.pages[0].missing) {
				return;
			}

			const page = new Morebits.wiki.Page('Talk:' + apiobj.params.page, 'حذف صفحة نقاش الصفحة ' + apiobj.params.page);
			page.setEditSummary('[[WP:CSD#G8|G8]]: [[Help:Talk page|صفحة نقاش]] الصفحة المحذوفة [[' + apiobj.params.page + ']]');
			page.setChangeTags(Twinkle.changeTags);
			page.deletePage();
		},
		callback_deleteRedirects = function (apiobj) {
			const response = apiobj.getResponse();
			const redirects = response.query.pages[0].redirects || [];
			redirects.forEach((rd) => {
				const title = rd.title;
				const page = new Morebits.wiki.Page(title, 'حذف صفحة إعادة التوجيه ' + title);
				page.setEditSummary('[[WP:CSD#G8|G8]]: إعادة توجيه إلى صفحة محذوفة [[' + apiobj.params.page + ']]');
				page.setChangeTags(Twinkle.changeTags);
				page.deletePage();
			});
		};

	Twinkle.addInitCallback(Twinkle.deprod, 'deprod');
}());

// </nowiki>
