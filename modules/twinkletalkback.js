// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkletalkback.js: Talkback module
	 ****************************************
	 * Mode of invocation:     Tab ("TB")
	 * Active on:              Any page with relevant user name (userspace, contribs, etc.) except IP ranges
	 */
	Twinkle.talkback = function () {
		if (!mw.config.exists('wgRelevantUserName') || Morebits.ip.isRange(mw.config.get('wgRelevantUserName'))) {
			return;
		}
		Twinkle.addPortletLink(Twinkle.talkback.callback, 'TB', 'twinkle-talkback', 'رد بسيط');
	};

	Twinkle.talkback.callback = function () {
		if (mw.config.get('wgRelevantUserName') === mw.config.get('wgUserName') && !confirm("هل الأمر سيئ للغاية لدرجة أنك ترد على نفسك؟")) {
			return;
		}

		const Window = new Morebits.SimpleWindow(600, 350);
		Window.setTitle('رد');
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('تفضيلات رد', 'ويكيبيديا:Twinkle/Preferences#talkback');
		Window.addFooterLink('مساعدة لمح البصر!', 'ويكيبيديا:لمح البصر/توثيق#talkback');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.talkback.evaluate);

		form.append({
			type: 'radio', name: 'tbtarget',
			list: [
				{
					label: 'رد',
					value: 'talkback',
					checked: 'true'
				},
				{
					label: 'الرجاء الاطلاع',
					value: 'see'
				},
				{
					label: 'إشعار لوحة الإعلانات',
					value: 'notice'
				},
				{
					label: "لديك بريد",
					value: 'mail'
				}
			],
			event: Twinkle.talkback.changeTarget
		});

		form.append({
			type: 'field',
			label: 'منطقة العمل',
			name: 'work_area'
		});

		const previewlink = document.createElement('a');
		$(previewlink).on('click', () => {
			Twinkle.talkback.callbacks.preview(result); // |result| is defined below
		});
		previewlink.style.cursor = 'pointer';
		previewlink.textContent = 'معاينة';
		form.append({ type: 'div', id: 'talkbackpreview', label: [previewlink] });
		form.append({ type: 'div', id: 'twinkletalkback-previewbox', style: 'display: none' });

		form.append({ type: 'submit' });

		var result = form.render();
		Window.setContent(result);
		Window.display();
		result.previewer = new Morebits.wiki.Preview($(result).find('div#twinkletalkback-previewbox').last()[0]);

		// We must init the
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.tbtarget[0].dispatchEvent(evt);

		// Check whether the user has opted out from talkback
		const query = {
			action: 'query',
			prop: 'extlinks',
			titles: 'User talk:' + mw.config.get('wgRelevantUserName'),
			elquery: 'userjs.invalid/noTalkback',
			ellimit: '1',
			format: 'json'
		};
		const wpapi = new Morebits.wiki.Api('جلب حالة إلغاء الاشتراك في talkback', query, Twinkle.talkback.callback.optoutStatus);
		wpapi.post();
	};

	Twinkle.talkback.optout = '';

	Twinkle.talkback.callback.optoutStatus = function (apiobj) {
		const el = apiobj.getResponse().query.pages[0].extlinks;
		if (el && el.length) {
			Twinkle.talkback.optout = mw.config.get('wgRelevantUserName') + ' يفضل عدم تلقي talkbacks';
			const url = el[0].url;
			const reason = mw.util.getParamValue('reason', url);
			Twinkle.talkback.optout += reason ? ': ' + reason : '.';
		}
		$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
	};

	let prev_page = '';
	let prev_section = '';
	let prev_message = '';

	Twinkle.talkback.changeTarget = function (e) {
		const value = e.target.values;
		const root = e.target.form;

		const old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];

		if (root.section) {
			prev_section = root.section.value;
		}
		if (root.message) {
			prev_message = root.message.value;
		}
		if (root.page) {
			prev_page = root.page.value;
		}

		let work_area = new Morebits.QuickForm.Element({
			type: 'field',
			label: 'معلومات رد',
			name: 'work_area'
		});

		root.previewer.closePreview();

		switch (value) {
			case 'talkback':
			/* falls through */
			default:
				work_area.append({
					type: 'div',
					label: '',
					style: 'color: red',
					id: 'twinkle-talkback-optout-message'
				});

				work_area.append({
					type: 'input',
					name: 'page',
					label: 'اسم صفحة المناقشة',
					tooltip: "اسم الصفحة التي تجري فيها المناقشة. على سبيل المثال: 'User talk:Jimbo Wales' أو Wikipedia talk:Twinkle'. يقتصر على جميع المحادثات ونطاق ويكيبيديا ونطاق القوالب.",
					value: prev_page || 'User talk:' + mw.config.get('wgUserName')
				});
				work_area.append({
					type: 'input',
					name: 'section',
					label: 'القسم المرتبط (اختياري)',
					tooltip: "عنوان القسم الذي تجري فيه المناقشة. على سبيل المثال: 'اقتراح دمج'.",
					value: prev_section
				});
				break;
			case 'notice':
				var noticeboard = work_area.append({
					type: 'select',
					name: 'noticeboard',
					label: 'لوحة الإعلانات:',
					event: function (e) {
						if (e.target.value === 'afchd') {
							Morebits.QuickForm.overrideElementLabel(root.section, 'عنوان المسودة (باستثناء البادئة): ');
							Morebits.QuickForm.setElementTooltipVisibility(root.section, false);
						} else {
							Morebits.QuickForm.resetElementLabel(root.section);
							Morebits.QuickForm.setElementTooltipVisibility(root.section, true);
						}
					}
				});

				$.each(Twinkle.talkback.noticeboards, (value, data) => {
					noticeboard.append({
						type: 'option',
						label: data.label,
						value: value,
						selected: !!data.defaultSelected
					});
				});

				work_area.append({
					type: 'input',
					name: 'section',
					label: 'الخيط المرتبط',
					tooltip: 'عنوان الموضوع ذي الصلة في صفحة لوحة الإعلانات.',
					value: prev_section
				});
				break;
			case 'mail':
				work_area.append({
					type: 'input',
					name: 'section',
					label: 'موضوع البريد الإلكتروني (اختياري)',
					tooltip: 'سطر الموضوع في البريد الإلكتروني الذي أرسلته.'
				});
				break;
		}

		if (value !== 'notice') {
			work_area.append({ type: 'textarea', label: 'رسالة إضافية (اختيارية):', name: 'message', tooltip: 'رسالة إضافية تود تركها أسفل قالب talkback. سيتم إضافة توقيعك في نهاية الرسالة إذا تركت واحدة.' });
		}

		work_area = work_area.render();
		root.replaceChild(work_area, old_area);
		if (root.message) {
			root.message.value = prev_message;
		}

		$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
	};

	Twinkle.talkback.noticeboards = {
		an: {
			label: "WP:AN (إخطار الإداريين)",
			text: '{{subst:AN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[ويكيبيديا:إخطار الإداريين]]'
		},
		an3: {
			label: "WP:AN3 (إخطار الإداريين/حرب التحرير)",
			text: '{{subst:An3-notice|$SECTION}} ~~~~',
			editSummary: "إشعار بالمناقشة في [[ويكيبيديا:إخطار الإداريين/استرجاعات ثلاثة]]"
		},
		ani: {
			label: "WP:ANI (إخطار الإداريين/الحوادث)",
			text: "== إشعار بمناقشة إخطار الإداريين/الحوادث ==\n" +
				'{{subst:ANI-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[ويكيبيديا:إخطار الإداريين/Incidents]]',
			defaultSelected: true
		},
		// let's keep AN and its cousins at the top
		afchd: {
			label: 'WP:AFCHD (مقالات لإنشاء/مكتب المساعدة)',
			text: '{{subst:AFCHD/u|$SECTION}} ~~~~',
			editSummary: 'لديك ردود في [[Wikipedia:AFCHD|مكتب مساعدة المقالات للإنشاء]]'
		},
		blpn: {
			label: 'WP:BLPN (لوحة إعلانات السير الذاتية للأشخاص الأحياء)',
			text: '{{subst:BLPN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Biographies of living persons/Noticeboard]]'
		},
		coin: {
			label: 'WP:COIN (لوحة إعلانات تضارب المصالح)',
			text: '{{subst:Coin-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Conflict of interest/Noticeboard]]'
		},
		drn: {
			label: 'WP:DRN (لوحة إعلانات حل النزاعات)',
			text: '{{subst:DRN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Dispute resolution noticeboard]]'
		},
		effp: {
			label: 'WP:EFFP/R (تقرير إيجابي زائف لمرشح التحرير)',
			text: '{{EFFPReply|1=$SECTION|2=~~~~}}',
			editSummary: 'لديك ردود على [[ويكيبيديا:مرشح الإساءة/حالات خاطئة/تقارير|تقرير إيجابي زائف لمرشح التحرير]]'
		},
		eln: {
			label: 'WP:ELN (لوحة إعلانات الروابط الخارجية)',
			text: '{{subst:ELN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:External links/Noticeboard]]'
		},
		ftn: {
			label: 'WP:FTN (لوحة إعلانات النظريات الهامشية)',
			text: '{{subst:Ftn-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Fringe theories/Noticeboard]]'
		},
		hd: {
			label: 'WP:HD (مكتب المساعدة)',
			text: '== سؤالك في مكتب المساعدة ==\n{{helpdeskreply|1=$SECTION|ts=~~~~~}}',
			editSummary: 'لديك ردود في [[ويكيبيديا:فريق المساعدة/طلبات|مكتب المساعدة في ويكيبيديا]]'
		},
		norn: {
			label: 'WP:NORN (لوحة إعلانات لا أبحاث أصلية)',
			text: '{{subst:Norn-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:No original research/Noticeboard]]'
		},
		npovn: {
			label: 'WP:NPOVN (لوحة إعلانات وجهة النظر المحايدة)',
			text: '{{subst:NPOVN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Neutral point of view/Noticeboard]]'
		},
		rsn: {
			label: 'WP:RSN (لوحة إعلانات المصادر الموثوقة)',
			text: '{{subst:RSN-notice|thread=$SECTION}} ~~~~',
			editSummary: 'إشعار بالمناقشة في [[Wikipedia:Reliable sources/Noticeboard]]'
		},
		th: {
			label: 'WP:THQ (منتدى أسئلة Teahouse)',
			text: "== Teahouse talkback: لديك رسائل! ==\n{{WP:Teahouse/Teahouse talkback|WP:Teahouse/Questions|$SECTION|ts=~~~~}}",
			editSummary: 'لديك ردود في [[ويكيبيديا:بوابة المشاركة|لوحة أسئلة Teahouse]]'
		},
		vrt: {
			label: 'WP:VRTN (لوحة إعلانات VRT)',
			text: '{{subst:VRTreply|1=$SECTION}}\n~~~~',
			editSummary: 'لديك ردود في [[Wikipedia:VRT noticeboard|لوحة إعلانات VRT]]'
		}
	};

	Twinkle.talkback.evaluate = function (e) {
		const input = Morebits.QuickForm.getInputData(e.target);

		const fullUserTalkPageName = new mw.Title(mw.config.get('wgRelevantUserName'), 3).toText();
		const talkpage = new Morebits.wiki.Page(fullUserTalkPageName, 'إضافة talkback');

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(e.target);

		Morebits.wiki.actionCompleted.redirect = fullUserTalkPageName;
		Morebits.wiki.actionCompleted.notice = 'اكتمل Talkback; إعادة تحميل صفحة النقاش في بضع ثوان';

		switch (input.tbtarget) {
			case 'notice':
				talkpage.setEditSummary(Twinkle.talkback.noticeboards[input.noticeboard].editSummary);
				break;
			case 'mail':
				talkpage.setEditSummary("إشعار: لديك بريد");
				break;
			case 'see':
				input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
				talkpage.setEditSummary('الرجاء التحقق من المناقشة في [[:' + input.page +
					(input.section ? '#' + input.section : '') + ']]');
				break;
			default: // talkback
				input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
				talkpage.setEditSummary('Talkback ([[:' + input.page +
					(input.section ? '#' + input.section : '') + ']])');
				break;
		}

		talkpage.setFollowRedirect(true);

		talkpage.load((pageobj) => {
			const whitespaceToPrepend = pageobj.exists() && pageobj.getPageText() !== '' ? '\n\n' : '';
			talkpage.setAppendText(whitespaceToPrepend + Twinkle.talkback.callbacks.getNoticeWikitext(input));
			talkpage.setChangeTags(Twinkle.changeTags);
			talkpage.setCreateOption('recreate');
			talkpage.setMinorEdit(Twinkle.getPref('markTalkbackAsMinor'));
			talkpage.append();
		});
	};

	Twinkle.talkback.callbacks = {
		// Not used for notice or mail, default to user page
		normalizeTalkbackPage: function (page) {
			page = page || mw.config.get('wgUserName');

			// Assume no prefix is a username, convert to user talk space
			let normal = mw.Title.newFromText(page, 3);
			// Normalize erroneous or likely mis-entered items
			if (normal) {
				// Only allow talks and WPspace, as well as Template-space for DYK
				if (normal.namespace !== 4 && normal.namespace !== 10) {
					normal = normal.getTalkPage();
				}
				page = normal.getPrefixedText();
			}
			return page;
		},

		preview: function (form) {
			const input = Morebits.QuickForm.getInputData(form);

			if (input.tbtarget === 'talkback' || input.tbtarget === 'see') {
				input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
			}

			const noticetext = Twinkle.talkback.callbacks.getNoticeWikitext(input);
			form.previewer.beginRender(noticetext, 'User talk:' + mw.config.get('wgRelevantUserName')); // Force wikitext/correct username
		},

		getNoticeWikitext: function (input) {
			let text;

			switch (input.tbtarget) {
				case 'notice':
					text = Morebits.string.safeReplace(Twinkle.talkback.noticeboards[input.noticeboard].text, '$SECTION', input.section);
					break;
				case 'mail':
					text = '==' + Twinkle.getPref('mailHeading') + '==\n' +
						"{{لديك بريد|subject=" + input.section + '|ts=~~~~~}}';

					if (input.message) {
						text += '\n' + input.message + '  ~~~~';
					} else if (Twinkle.getPref('insertTalkbackSignature')) {
						text += '\n~~~~';
					}
					break;
				case 'see':
					var heading = Twinkle.getPref('talkbackHeading');
					text = '{{subst:دعوة|location=' + input.page + (input.section ? '#' + input.section : '') +
						'|more=' + input.message + '|heading=' + heading + '}}';
					break;
				default: // talkback
					text = '==' + Twinkle.getPref('talkbackHeading') + '==\n' +
						'{{رد|' + input.page + (input.section ? '|' + input.section : '') + '|ts=~~~~~}}';

					if (input.message) {
						text += '\n' + input.message + ' ~~~~';
					} else if (Twinkle.getPref('insertTalkbackSignature')) {
						text += '\n~~~~';
					}
			}
			return text;
		}
	};
	Twinkle.addInitCallback(Twinkle.talkback, 'talkback');
}());

// </nowiki>
