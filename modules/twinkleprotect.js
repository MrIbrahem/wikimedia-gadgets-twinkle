// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleprotect.js: Protect/RPP module
	 ****************************************
	 * Mode of invocation:     Tab ("PP"/"RPP")
	 * Active on:              Non-special, non-MediaWiki pages
	 */

	// Note: a lot of code in this module is re-used/called by batchprotect.
	Twinkle.protect = function twinkleprotect() {
		if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgNamespaceNumber') === 8) {
			return;
		}

		Twinkle.addPortletLink(Twinkle.protect.callback, Morebits.userIsSysop ? 'PP' : 'RPP', 'tw-rpp',
			Morebits.userIsSysop ? 'حماية الصفحة' : 'طلب حماية الصفحة');
	};

	Twinkle.protect.callback = function twinkleprotectCallback() {
		const Window = new Morebits.SimpleWindow(620, 530);
		Window.setTitle(Morebits.userIsSysop ? 'تطبيق أو طلب أو إضافة قالب حماية صفحة' : 'طلب أو إضافة قالب حماية صفحة');
		Window.setScriptName('Twinkle');
		Window.addFooterLink('قوالب الحماية', 'Template:Protection templates');
		Window.addFooterLink('سياسة الحماية', 'WP:PROT');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#protect');
		Window.addFooterLink('إعطاء ملاحظات', 'WT:TW');

		const form = new Morebits.QuickForm(Twinkle.protect.callback.evaluate);
		const actionfield = form.append({
			type: 'field',
			label: 'نوع الإجراء'
		});
		if (Morebits.userIsSysop) {
			actionfield.append({
				type: 'radio',
				name: 'actiontype',
				event: Twinkle.protect.callback.changeAction,
				list: [
					{
						label: 'حماية الصفحة',
						value: 'protect',
						tooltip: 'تطبيق حماية فعلية على الصفحة.',
						checked: true
					}
				]
			});
		}
		actionfield.append({
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: 'طلب حماية الصفحة',
					value: 'request',
					tooltip: 'إذا كنت ترغب في طلب الحماية عبر WP:RPP' + (Morebits.userIsSysop ? ' بدلاً من القيام بالحماية بنفسك.' : '.'),
					checked: !Morebits.userIsSysop
				},
				{
					label: 'ضع قالب حماية على الصفحة',
					value: 'tag',
					tooltip: 'إذا نسي المسؤول الذي يقوم بالحماية تطبيق قالب حماية، أو قمت للتو بحماية الصفحة دون وضع علامة، فيمكنك استخدام هذا لتطبيق قالب الحماية المناسب.',
					disabled: mw.config.get('wgArticleId') === 0 || mw.config.get('wgPageContentModel') === 'Scribunto' || mw.config.get('wgNamespaceNumber') === 710 // TimedText
				}
			]
		});

		form.append({ type: 'field', label: 'إعداد مسبق', name: 'field_preset' });
		form.append({ type: 'field', label: '1', name: 'field1' });
		form.append({ type: 'field', label: '2', name: 'field2' });

		form.append({ type: 'submit' });

		const result = form.render();
		Window.setContent(result);
		Window.display();

		// We must init the controls
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.actiontype[0].dispatchEvent(evt);

		// get current protection level asynchronously
		Twinkle.protect.fetchProtectionLevel();
	};

	// A list of bots who may be the protecting sysop, for whom we shouldn't
	// remind the user contact before requesting unprotection (evaluate)
	Twinkle.protect.trustedBots = ['MusikBot II', 'TFA Protector Bot'];

	// Customizable namespace and FlaggedRevs settings
	// In theory it'd be nice to have restrictionlevels defined here,
	// but those are only available via a siteinfo query

	// mw.loader.getState('ext.flaggedRevs.review') returns null if the
	// FlaggedRevs extension is not registered.  Previously, this was done with
	// wgFlaggedRevsParams, but after 1.34-wmf4 it is no longer exported if empty
	// (https://gerrit.wikimedia.org/r/c/mediawiki/extensions/FlaggedRevs/+/508427)
	const hasFlaggedRevs = mw.loader.getState('ext.flaggedRevs.review') &&
		// FlaggedRevs only valid in some namespaces, hardcoded until [[phab:T218479]]
		(mw.config.get('wgNamespaceNumber') === 0 || mw.config.get('wgNamespaceNumber') === 4);
	// Limit template editor; a Twinkle restriction, not a site setting
	const isTemplate = mw.config.get('wgNamespaceNumber') === 10 || mw.config.get('wgNamespaceNumber') === 828;

	// Contains the current protection level in an object
	// Once filled, it will look something like:
	// { edit: { level: "sysop", expiry: <some date>, cascade: true }, ... }
	Twinkle.protect.currentProtectionLevels = {};

	// returns a jQuery Deferred object, usage:
	//   Twinkle.protect.fetchProtectingAdmin(apiObject, pageName, protect/stable).done(function(admin_username) { ...code... });
	Twinkle.protect.fetchProtectingAdmin = function twinkleprotectFetchProtectingAdmin(api, pageName, protType, logIds) {
		logIds = logIds || [];

		return api.get({
			format: 'json',
			action: 'query',
			list: 'logevents',
			letitle: pageName,
			letype: protType
		}).then((data) => {
			// don't check log entries that have already been checked (e.g. don't go into an infinite loop!)
			const event = data.query ? $.grep(data.query.logevents, (le) => $.inArray(le.logid, logIds))[0] : null;
			if (!event) {
				// fail gracefully
				return null;
			} else if (event.action === 'move_prot' || event.action === 'move_stable') {
				return twinkleprotectFetchProtectingAdmin(api, protType === 'protect' ? event.params.oldtitle_title : event.params.oldtitle, protType, logIds.concat(event.logid));
			}
			return event.user;
		});
	};

	Twinkle.protect.fetchProtectionLevel = function twinkleprotectFetchProtectionLevel() {

		const api = new mw.Api();
		const protectDeferred = api.get({
			format: 'json',
			indexpageids: true,
			action: 'query',
			list: 'logevents',
			letype: 'protect',
			letitle: mw.config.get('wgPageName'),
			prop: hasFlaggedRevs ? 'info|flagged' : 'info',
			inprop: 'protection|watched',
			titles: mw.config.get('wgPageName')
		});
		const stableDeferred = api.get({
			format: 'json',
			action: 'query',
			list: 'logevents',
			letype: 'stable',
			letitle: mw.config.get('wgPageName')
		});

		const earlyDecision = [protectDeferred];
		if (hasFlaggedRevs) {
			earlyDecision.push(stableDeferred);
		}

		$.when.apply($, earlyDecision).done((protectData, stableData) => {
			// $.when.apply is supposed to take an unknown number of promises
			// via an array, which it does, but the type of data returned varies.
			// If there are two or more deferreds, it returns an array (of objects),
			// but if there's just one deferred, it retuns a simple object.
			// This is annoying.
			protectData = $(protectData).toArray();

			const pageid = protectData[0].query.pageids[0];
			const page = protectData[0].query.pages[pageid];
			const current = {};
			let adminEditDeferred;

			// Save requested page's watched status for later in case needed when filing request
			Twinkle.protect.watched = page.watchlistexpiry || page.watched === '';

			$.each(page.protection, (index, protection) => {
				// Don't overwrite actual page protection with cascading protection
				if (!protection.source) {
					current[protection.type] = {
						level: protection.level,
						expiry: protection.expiry,
						cascade: protection.cascade === ''
					};
					// logs report last admin who made changes to either edit/move/create protection, regardless if they only modified one of them
					if (!adminEditDeferred) {
						adminEditDeferred = Twinkle.protect.fetchProtectingAdmin(api, mw.config.get('wgPageName'), 'protect');
					}
				} else {
					// Account for the page being covered by cascading protection
					current.cascading = {
						expiry: protection.expiry,
						source: protection.source,
						level: protection.level // should always be sysop, unused
					};
				}
			});

			if (page.flagged) {
				current.stabilize = {
					level: page.flagged.protection_level,
					expiry: page.flagged.protection_expiry
				};
				adminEditDeferred = Twinkle.protect.fetchProtectingAdmin(api, mw.config.get('wgPageName'), 'stable');
			}

			// show the protection level and log info
			Twinkle.protect.hasProtectLog = !!protectData[0].query.logevents.length;
			Twinkle.protect.protectLog = Twinkle.protect.hasProtectLog && protectData[0].query.logevents;
			Twinkle.protect.hasStableLog = hasFlaggedRevs ? !!stableData[0].query.logevents.length : false;
			Twinkle.protect.stableLog = Twinkle.protect.hasStableLog && stableData[0].query.logevents;
			Twinkle.protect.currentProtectionLevels = current;

			if (adminEditDeferred) {
				adminEditDeferred.done((admin) => {
					if (admin) {
						$.each(['edit', 'move', 'create', 'stabilize', 'cascading'], (i, type) => {
							if (Twinkle.protect.currentProtectionLevels[type]) {
								Twinkle.protect.currentProtectionLevels[type].admin = admin;
							}
						});
					}
					Twinkle.protect.callback.showLogAndCurrentProtectInfo();
				});
			} else {
				Twinkle.protect.callback.showLogAndCurrentProtectInfo();
			}
		});
	};

	Twinkle.protect.callback.showLogAndCurrentProtectInfo = function twinkleprotectCallbackShowLogAndCurrentProtectInfo() {
		const currentlyProtected = !$.isEmptyObject(Twinkle.protect.currentProtectionLevels);

		if (Twinkle.protect.hasProtectLog || Twinkle.protect.hasStableLog) {
			const $linkMarkup = $('<span>');

			if (Twinkle.protect.hasProtectLog) {
				$linkMarkup.append(
					$('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: mw.config.get('wgPageName'), type: 'protect' }) + '">سجل الحماية</a>'));
				if (!currentlyProtected || (!Twinkle.protect.currentProtectionLevels.edit && !Twinkle.protect.currentProtectionLevels.move)) {
					const lastProtectAction = Twinkle.protect.protectLog[0];
					if (lastProtectAction.action === 'unprotect') {
						$linkMarkup.append(' (تمت إزالة الحماية ' + new Morebits.Date(lastProtectAction.timestamp).calendar('utc') + ')');
					} else { // protect or modify
						$linkMarkup.append(' (انتهت صلاحيته ' + new Morebits.Date(lastProtectAction.params.details[0].expiry).calendar('utc') + ')');
					}
				}
				$linkMarkup.append(Twinkle.protect.hasStableLog ? $('<span> • </span>') : null);
			}

			if (Twinkle.protect.hasStableLog) {
				$linkMarkup.append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: mw.config.get('wgPageName'), type: 'stable' }) + '">سجل التغييرات المعلقة</a>)'));
				if (!currentlyProtected || !Twinkle.protect.currentProtectionLevels.stabilize) {
					const lastStabilizeAction = Twinkle.protect.stableLog[0];
					if (lastStabilizeAction.action === 'reset') {
						$linkMarkup.append(' (إعادة الضبط ' + new Morebits.Date(lastStabilizeAction.timestamp).calendar('utc') + ')');
					} else { // config or modify
						$linkMarkup.append(' (انتهت صلاحيته ' + new Morebits.Date(lastStabilizeAction.params.expiry).calendar('utc') + ')');
					}
				}
			}

			Morebits.Status.init($('div[name="hasprotectlog"] span')[0]);
			Morebits.Status.warn(
				currentlyProtected ? 'عمليات الحماية السابقة' : 'تمت حماية هذه الصفحة في الماضي',
				$linkMarkup[0]
			);
		}

		Morebits.Status.init($('div[name="currentprot"] span')[0]);
		let protectionNode = [], statusLevel = 'info';

		if (currentlyProtected) {
			$.each(Twinkle.protect.currentProtectionLevels, (type, settings) => {
				let label = type === 'stabilize' ? 'تغييرات معلقة' : Morebits.string.toUpperCaseFirstChar(type);

				if (type === 'cascading') { // Covered by another page
					label = 'حماية متتالية ';
					protectionNode.push($('<b>' + label + '</b>')[0]);
					if (settings.source) { // Should by definition exist
						const sourceLink = '<a target="_blank" href="' + mw.util.getUrl(settings.source) + '">' + settings.source + '</a>';
						protectionNode.push($('<span>من ' + sourceLink + '</span>')[0]);
					}
				} else {
					let level = settings.level;
					// Make cascading protection more prominent
					if (settings.cascade) {
						level += ' (متتالية)';
					}
					protectionNode.push($('<b>' + label + ': ' + level + '</b>')[0]);
				}

				if (settings.expiry === 'infinity') {
					protectionNode.push(' (إلى أجل غير مسمى) ');
				} else {
					protectionNode.push(' (تنتهي صلاحيته ' + new Morebits.Date(settings.expiry).calendar('utc') + ') ');
				}
				if (settings.admin) {
					const adminLink = '<a target="_blank" href="' + mw.util.getUrl('User talk:' + settings.admin) + '">' + settings.admin + '</a>';
					protectionNode.push($('<span>بواسطة ' + adminLink + '</span>')[0]);
				}
				protectionNode.push($('<span> \u2022 </span>')[0]);
			});
			protectionNode = protectionNode.slice(0, -1); // remove the trailing bullet
			statusLevel = 'warn';
		} else {
			protectionNode.push($('<b>لا توجد حماية</b>')[0]);
		}

		Morebits.Status[statusLevel]('مستوى الحماية الحالي', protectionNode);
	};

	Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
		let field_preset;
		let field1;
		let field2;

		switch (e.target.values) {
			case 'protect':
				field_preset = new Morebits.QuickForm.Element({ type: 'field', label: 'إعداد مسبق', name: 'field_preset' });
				field_preset.append({
					type: 'select',
					name: 'category',
					label: 'اختر إعدادًا مسبقًا:',
					event: Twinkle.protect.callback.changePreset,
					list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
				});

				field2 = new Morebits.QuickForm.Element({ type: 'field', label: 'خيارات الحماية', name: 'field2' });
				field2.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
				field2.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
				// for existing pages
				if (mw.config.get('wgArticleId')) {
					field2.append({
						type: 'checkbox',
						event: Twinkle.protect.formevents.editmodify,
						list: [
							{
								label: 'تعديل حماية التعديل',
								name: 'editmodify',
								tooltip: 'إذا تم إيقاف تشغيل هذا الخيار، فسيتم ترك مستوى حماية التعديل ووقت انتهاء الصلاحية كما هو.',
								checked: true
							}
						]
					});
					field2.append({
						type: 'select',
						name: 'editlevel',
						label: 'من يمكنه التعديل:',
						event: Twinkle.protect.formevents.editlevel,
						// Filter TE outside of templates and modules
						list: Twinkle.protect.protectionLevels.filter((level) => isTemplate || level.value !== 'templateeditor')
					});
					field2.append({
						type: 'select',
						name: 'editexpiry',
						label: 'تنتهي صلاحيته:',
						event: function (e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
						list: Twinkle.protect.protectionLengths
					});
					field2.append({
						type: 'checkbox',
						event: Twinkle.protect.formevents.movemodify,
						list: [
							{
								label: 'تعديل حماية النقل',
								name: 'movemodify',
								tooltip: 'إذا تم إيقاف تشغيل هذا الخيار، فسيتم ترك مستوى حماية النقل ووقت انتهاء الصلاحية كما هو.',
								checked: true
							}
						]
					});
					field2.append({
						type: 'select',
						name: 'movelevel',
						label: 'من يمكنه النقل:',
						event: Twinkle.protect.formevents.movelevel,
						// Autoconfirmed is required for a move, redundant
						list: Twinkle.protect.protectionLevels.filter((level) => level.value !== 'autoconfirmed' && (isTemplate || level.value !== 'templateeditor'))
					});
					field2.append({
						type: 'select',
						name: 'moveexpiry',
						label: 'تنتهي صلاحيته:',
						event: function (e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
						list: Twinkle.protect.protectionLengths
					});
					if (hasFlaggedRevs) {
						field2.append({
							type: 'checkbox',
							event: Twinkle.protect.formevents.pcmodify,
							list: [
								{
									label: 'تعديل حماية التغييرات المعلقة',
									name: 'pcmodify',
									tooltip: 'إذا تم إيقاف تشغيل هذا الخيار، فسيتم ترك مستوى التغييرات المعلقة ووقت انتهاء الصلاحية كما هو.',
									checked: true
								}
							]
						});
						field2.append({
							type: 'select',
							name: 'pclevel',
							label: 'تغييرات معلقة:',
							event: Twinkle.protect.formevents.pclevel,
							list: [
								{ label: 'لا شيء', value: 'none' },
								{ label: 'تغيير معلق', value: 'autoconfirmed', selected: true }
							]
						});
						field2.append({
							type: 'select',
							name: 'pcexpiry',
							label: 'تنتهي صلاحيته:',
							event: function (e) {
								if (e.target.value === 'custom') {
									Twinkle.protect.doCustomExpiry(e.target);
								}
							},
							// default expiry selection (1 month) is conditionally set in Twinkle.protect.callback.changePreset
							list: Twinkle.protect.protectionLengths
						});
					}
				} else { // for non-existing pages
					field2.append({
						type: 'select',
						name: 'createlevel',
						label: 'حماية الإنشاء:',
						event: Twinkle.protect.formevents.createlevel,
						// Filter TE always, and autoconfirmed in mainspace, redundant since WP:ACPERM
						list: Twinkle.protect.protectionLevels.filter((level) => level.value !== 'templateeditor' && (mw.config.get('wgNamespaceNumber') !== 0 || level.value !== 'autoconfirmed'))
					});
					field2.append({
						type: 'select',
						name: 'createexpiry',
						label: 'تنتهي صلاحيته:',
						event: function (e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						// default expiry selection (indefinite) is conditionally set in Twinkle.protect.callback.changePreset
						list: Twinkle.protect.protectionLengths
					});
				}
				field2.append({
					type: 'textarea',
					name: 'protectReason',
					label: 'السبب (لسجل الحماية):'
				});
				field2.append({
					type: 'div',
					name: 'protectReason_notes',
					label: 'ملاحظات:',
					style: 'display:inline-block; margin-top:4px;',
					tooltip: 'أضف ملاحظة إلى سجل الحماية بأن هذا تم طلبه في RfPP.'
				});
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.callback.annotateProtectReason,
					style: 'display:inline-block; margin-top:4px;',
					list: [
						{
							label: 'طلب RfPP',
							name: 'protectReason_notes_rfpp',
							checked: false,
							value: 'تم طلبه في [[WP:RfPP]]'
						}
					]
				});
				field2.append({
					type: 'input',
					event: Twinkle.protect.callback.annotateProtectReason,
					label: 'معرف مراجعة RfPP',
					name: 'protectReason_notes_rfppRevid',
					value: '',
					tooltip: 'معرف المراجعة الاختياري لصفحة RfPP حيث تم طلب الحماية.'
				});
				if (!mw.config.get('wgArticleId') || mw.config.get('wgPageContentModel') === 'Scribunto' || mw.config.get('wgNamespaceNumber') === 710) { // tagging isn't relevant for non-existing, module, or TimedText pages
					break;
				}
			/* falls through */
			case 'tag':
				field1 = new Morebits.QuickForm.Element({ type: 'field', label: 'خيارات وضع القوالب', name: 'field1' });
				field1.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
				field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
				field1.append({
					type: 'select',
					name: 'tagtype',
					label: 'اختر قالب الحماية:',
					list: Twinkle.protect.protectionTags,
					event: Twinkle.protect.formevents.tagtype
				});

				var isTemplateNamespace = mw.config.get('wgNamespaceNumber') === 10;
				var isAFD = Morebits.pageNameNorm.startsWith('Wikipedia:Articles for deletion/');
				var isCode = ['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'));
				field1.append({
					type: 'checkbox',
					list: [
						{
							name: 'small',
							label: 'تصغير الأيقونة (small=yes)',
							tooltip: 'سيستخدم الميزة |small=yes الخاصة بالقالب، وسيقوم فقط بعرضها كقفل مفتاح',
							checked: true
						},
						{
							name: 'noinclude',
							label: 'لف قالب الحماية بـ <noinclude>',
							tooltip: 'سيقوم بلف قالب الحماية في علامات <noinclude>، بحيث لا يتم تضمينه',
							checked: (isTemplateNamespace || isAFD) && !isCode
						}
					]
				});
				break;

			case 'request':
				field_preset = new Morebits.QuickForm.Element({ type: 'field', label: 'نوع الحماية', name: 'field_preset' });
				field_preset.append({
					type: 'select',
					name: 'category',
					label: 'النوع والسبب:',
					event: Twinkle.protect.callback.changePreset,
					list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
				});

				field1 = new Morebits.QuickForm.Element({ type: 'field', label: 'خيارات', name: 'field1' });
				field1.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
				field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
				field1.append({
					type: 'select',
					name: 'expiry',
					label: 'المدة:',
					list: [
						{ label: '', selected: true, value: '' },
						{ label: 'مؤقت', value: 'temporary' },
						{ label: 'غير محدد', value: 'infinity' }
					]
				});
				field1.append({
					type: 'textarea',
					name: 'reason',
					label: 'السبب:'
				});
				break;
			default:
				alert("هناك خطأ ما في twinkleprotect");
				break;
		}

		let oldfield;

		if (field_preset) {
			oldfield = $(e.target.form).find('fieldset[name="field_preset"]')[0];
			oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
		} else {
			$(e.target.form).find('fieldset[name="field_preset"]').css('display', 'none');
		}
		if (field1) {
			oldfield = $(e.target.form).find('fieldset[name="field1"]')[0];
			oldfield.parentNode.replaceChild(field1.render(), oldfield);
		} else {
			$(e.target.form).find('fieldset[name="field1"]').css('display', 'none');
		}
		if (field2) {
			oldfield = $(e.target.form).find('fieldset[name="field2"]')[0];
			oldfield.parentNode.replaceChild(field2.render(), oldfield);
		} else {
			$(e.target.form).find('fieldset[name="field2"]').css('display', 'none');
		}

		if (e.target.values === 'protect') {
			// fake a change event on the preset dropdown
			const evt = document.createEvent('Event');
			evt.initEvent('change', true, true);
			e.target.form.category.dispatchEvent(evt);

			// reduce vertical height of dialog
			$(e.target.form).find('fieldset[name="field2"] select').parent().css({ display: 'inline-block', marginRight: '0.5em' });
			$(e.target.form).find('fieldset[name="field2"] input[name="protectReason_notes_rfppRevid"]').parent().css({ display: 'inline-block', marginLeft: '15px' }).hide();
		}

		// re-add protection level and log info, if it's available
		Twinkle.protect.callback.showLogAndCurrentProtectInfo();
	};

	// NOTE: This function is used by batchprotect as well
	Twinkle.protect.formevents = {
		editmodify: function twinkleprotectFormEditmodifyEvent(e) {
			e.target.form.editlevel.disabled = !e.target.checked;
			e.target.form.editexpiry.disabled = !e.target.checked || (e.target.form.editlevel.value === 'all');
			e.target.form.editlevel.style.color = e.target.form.editexpiry.style.color = e.target.checked ? '' : 'transparent';
		},
		editlevel: function twinkleprotectFormEditlevelEvent(e) {
			e.target.form.editexpiry.disabled = e.target.value === 'all';
		},
		movemodify: function twinkleprotectFormMovemodifyEvent(e) {
			// sync move settings with edit settings if applicable
			if (e.target.form.movelevel.disabled && !e.target.form.editlevel.disabled) {
				e.target.form.movelevel.value = e.target.form.editlevel.value;
				e.target.form.moveexpiry.value = e.target.form.editexpiry.value;
			} else if (e.target.form.editlevel.disabled) {
				e.target.form.movelevel.value = 'sysop';
				e.target.form.moveexpiry.value = 'infinity';
			}
			e.target.form.movelevel.disabled = !e.target.checked;
			e.target.form.moveexpiry.disabled = !e.target.checked || (e.target.form.movelevel.value === 'all');
			e.target.form.movelevel.style.color = e.target.form.moveexpiry.style.color = e.target.checked ? '' : 'transparent';
		},
		movelevel: function twinkleprotectFormMovelevelEvent(e) {
			e.target.form.moveexpiry.disabled = e.target.value === 'all';
		},
		pcmodify: function twinkleprotectFormPcmodifyEvent(e) {
			e.target.form.pclevel.disabled = !e.target.checked;
			e.target.form.pcexpiry.disabled = !e.target.checked || (e.target.form.pclevel.value === 'none');
			e.target.form.pclevel.style.color = e.target.form.pcexpiry.style.color = e.target.checked ? '' : 'transparent';
		},
		pclevel: function twinkleprotectFormPclevelEvent(e) {
			e.target.form.pcexpiry.disabled = e.target.value === 'none';
		},
		createlevel: function twinkleprotectFormCreatelevelEvent(e) {
			e.target.form.createexpiry.disabled = e.target.value === 'all';
		},
		tagtype: function twinkleprotectFormTagtypeEvent(e) {
			e.target.form.small.disabled = e.target.form.noinclude.disabled = (e.target.value === 'none') || (e.target.value === 'noop');
		}
	};

	Twinkle.protect.doCustomExpiry = function twinkleprotectDoCustomExpiry(target) {
		const custom = prompt('أدخل وقت انتهاء الصلاحية المخصص. \nيمكنك استخدام الأوقات النسبية، مثل "1 دقيقة" أو "19 يومًا"، أو الطوابع الزمنية المطلقة، "yyyymmddhhmm" (على سبيل المثال "200602011405" هو 1 فبراير 2006، الساعة 14:05 بالتوقيت العالمي المنسق).', '');
		if (custom) {
			const option = document.createElement('option');
			option.setAttribute('value', custom);
			option.textContent = custom;
			target.appendChild(option);
			target.value = custom;
		} else {
			target.selectedIndex = 0;
		}
	};

	// NOTE: This list is used by batchprotect as well
	Twinkle.protect.protectionLevels = [
		{ label: 'الكل', value: 'all' },
		{ label: 'مؤكد تلقائيًا', value: 'autoconfirmed' },
		{ label: 'مؤكد موسع', value: 'extendedconfirmed' },
		{ label: 'محرر القوالب', value: 'templateeditor' },
		{ label: 'المشرف', value: 'sysop', selected: true }
	];

	// default expiry selection is conditionally set in Twinkle.protect.callback.changePreset
	// NOTE: This list is used by batchprotect as well
	Twinkle.protect.protectionLengths = [
		{ label: 'ساعة واحدة', value: '1 hour' },
		{ label: 'ساعتان', value: '2 hours' },
		{ label: '3 ساعات', value: '3 hours' },
		{ label: '6 ساعات', value: '6 hours' },
		{ label: '12 ساعة', value: '12 hours' },
		{ label: 'يوم واحد', value: '1 day' },
		{ label: 'يومان', value: '2 days' },
		{ label: '3 أيام', value: '3 days' },
		{ label: '4 أيام', value: '4 days' },
		{ label: '10 أيام', value: '10 days' },
		{ label: 'أسبوع واحد', value: '1 week' },
		{ label: 'أسبوعان', value: '2 weeks' },
		{ label: 'شهر واحد', value: '1 month' },
		{ label: 'شهران', value: '2 months' },
		{ label: '3 أشهر', value: '3 months' },
		{ label: '6 أشهر', value: '6 months' },
		{ label: 'سنة واحدة', value: '1 year' },
		{ label: 'سنتان', value: '2 years' },
		{ label: 'إلى أجل غير مسمى', value: 'infinity' },
		{ label: 'مخصص...', value: 'custom' }
	];


	Twinkle.protect.protectionTypes = [
		{ label: 'إلغاء الحماية', value: 'unprotect' },
		{
			label: 'حماية كاملة',
			list: [
				{ label: 'عام (كامل)', value: 'pp-protected' },
				{ label: 'نزاع محتوى/حرب تحرير (كامل)', value: 'pp-dispute' },
				{ label: 'تخريب مستمر (كامل)', value: 'pp-vandalism' },
				{ label: 'صفحة نقاش مستخدم محظور (كامل)', value: 'pp-usertalk' }
			]
		},
		{
			label: 'حماية القالب',
			list: [
				{ label: 'قالب مرئي للغاية (TE)', value: 'pp-template' }
			]
		},
		{
			label: 'حماية مؤكدة ممتدة',
			list: [
				{ label: 'عام (ECP)', value: 'pp-30-500' },
				{ label: 'إنفاذ التحكيم (ECP)', selected: true, value: 'pp-30-500-arb' },
				{ label: 'تخريب مستمر (ECP)', value: 'pp-30-500-vandalism' },
				{ label: 'تعديل تخريبي (ECP)', value: 'pp-30-500-disruptive' },
				{ label: 'انتهاكات سياسة BLP (ECP)', value: 'pp-30-500-blp' },
				{ label: 'استخدام الدمى (ECP)', value: 'pp-30-500-sock' }
			]
		},
		{
			label: 'حماية شبه',
			list: [
				{ label: 'عام (شبه)', value: 'pp-semi-protected' },
				{ label: 'تخريب مستمر (شبه)', selected: true, value: 'pp-semi-vandalism' },
				{ label: 'تعديل تخريبي (شبه)', value: 'pp-semi-disruptive' },
				{ label: 'إضافة محتوى غير مدعوم بمصادر (شبه)', value: 'pp-semi-unsourced' },
				{ label: 'انتهاكات سياسة BLP (شبه)', value: 'pp-semi-blp' },
				{ label: 'استخدام الدمى (شبه)', value: 'pp-semi-sock' },
				{ label: 'صفحة نقاش مستخدم محظور (شبه)', value: 'pp-semi-usertalk' }
			]
		},
		{
			label: 'تغييرات معلقة',
			list: [
				{ label: 'عام (PC)', value: 'pp-pc-protected' },
				{ label: 'تخريب مستمر (PC)', value: 'pp-pc-vandalism' },
				{ label: 'تعديل تخريبي (PC)', value: 'pp-pc-disruptive' },
				{ label: 'إضافة محتوى غير مدعوم بمصادر (PC)', value: 'pp-pc-unsourced' },
				{ label: 'انتهاكات سياسة BLP (PC)', value: 'pp-pc-blp' }
			]
		},
		{
			label: 'حماية النقل',
			list: [
				{ label: 'عام (نقل)', value: 'pp-move' },
				{ label: 'نزاع/حرب نقل (نقل)', value: 'pp-move-dispute' },
				{ label: 'تخريب نقل الصفحات (نقل)', value: 'pp-move-vandalism' },
				{ label: 'صفحة مرئية للغاية (نقل)', value: 'pp-move-indef' }
			]
		}
	]
		// Filter for templates and flaggedrevs
		.filter((type) => (isTemplate || type.label !== 'Template protection') && (hasFlaggedRevs || type.label !== 'Pending changes'));

	Twinkle.protect.protectionTypesCreate = [
		{ label: 'إلغاء الحماية', value: 'unprotect' },
		{
			label: 'حماية الإنشاء',
			list: [
				{ label: 'اسم مسيء', value: 'pp-create-offensive' },
				{ label: 'أعيد إنشاؤه بشكل متكرر', selected: true, value: 'pp-create-salt' },
				{ label: 'سيرة شخصية محذوفة حديثًا', value: 'pp-create-blp' }
			]
		}
	];

	// A page with both regular and PC protection will be assigned its regular
	// protection weight plus 2
	Twinkle.protect.protectionWeight = {
		sysop: 40,
		templateeditor: 30,
		extendedconfirmed: 20,
		autoconfirmed: 10,
		flaggedrevs_autoconfirmed: 5, // Pending Changes protection alone
		all: 0,
		flaggedrevs_none: 0 // just in case
	};

	// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
	// Also note: stabilize = Pending Changes level
	// expiry will override any defaults
	Twinkle.protect.protectionPresetsInfo = {
		'pp-protected': {
			edit: 'sysop',
			move: 'sysop',
			reason: null
		},
		'pp-dispute': {
			edit: 'sysop',
			move: 'sysop',
			reason: '[[WP:PP#Content disputes|حرب تحرير / نزاع محتوى]]'
		},
		'pp-vandalism': {
			edit: 'sysop',
			move: 'sysop',
			reason: '[[WP:Vandalism|تخريب مستمر]]'
		},
		'pp-usertalk': {
			edit: 'sysop',
			move: 'sysop',
			expiry: 'infinity',
			reason: '[[WP:PP#Talk-page protection|استخدام غير لائق لصفحة نقاش المستخدم أثناء الحظر]]'
		},
		'pp-template': {
			edit: 'templateeditor',
			move: 'templateeditor',
			expiry: 'infinity',
			reason: '[[WP:High-risk templates|قالب مرئي للغاية]]'
		},
		'pp-30-500-arb': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			expiry: 'infinity',
			reason: '[[WP:30/500|إنفاذ التحكيم]]',
			template: 'pp-extended'
		},
		'pp-30-500-vandalism': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			reason: '[[WP:Vandalism|تخريب مستمر]] من حسابات (مؤكدة تلقائيًا)',
			template: 'pp-extended'
		},
		'pp-30-500-disruptive': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			reason: '[[WP:Disruptive editing|تحرير تخريبي مستمر]] من حسابات (مؤكدة تلقائيًا)',
			template: 'pp-extended'
		},
		'pp-30-500-blp': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			reason: 'انتهاكات مستمرة لـ [[ويكيبيديا:سير الأحياء|سياسة السير الذاتية للأشخاص الأحياء]] من حسابات (مؤكدة تلقائيًا)',
			template: 'pp-extended'
		},
		'pp-30-500-sock': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			reason: '[[WP:Sock puppetry|استخدام الدمى المستمر]]',
			template: 'pp-extended'
		},
		'pp-30-500': {
			edit: 'extendedconfirmed',
			move: 'extendedconfirmed',
			reason: null,
			template: 'pp-extended'
		},
		'pp-semi-vandalism': {
			edit: 'autoconfirmed',
			reason: '[[WP:Vandalism|تخريب مستمر]]',
			template: 'pp-vandalism'
		},
		'pp-semi-disruptive': {
			edit: 'autoconfirmed',
			reason: '[[WP:Disruptive editing|تحرير تخريبي مستمر]]',
			template: 'pp-protected'
		},
		'pp-semi-unsourced': {
			edit: 'autoconfirmed',
			reason: 'إضافة مستمرة لـ [[WP:INTREF|محتوى غير مدعوم بمصادر أو ذي مصادر ضعيفة]]',
			template: 'pp-protected'
		},
		'pp-semi-blp': {
			edit: 'autoconfirmed',
			reason: 'انتهاكات [[ويكيبيديا:سير الأحياء|سياسة السير الذاتية للأشخاص الأحياء]]',
			template: 'pp-blp'
		},
		'pp-semi-usertalk': {
			edit: 'autoconfirmed',
			move: 'autoconfirmed',
			expiry: 'infinity',
			reason: '[[WP:PP#Talk-page protection|استخدام غير لائق لصفحة نقاش المستخدم أثناء الحظر]]',
			template: 'pp-usertalk'
		},
		'pp-semi-template': { // removed for now
			edit: 'autoconfirmed',
			move: 'autoconfirmed',
			expiry: 'infinity',
			reason: '[[WP:High-risk templates|قالب مرئي للغاية]]',
			template: 'pp-template'
		},
		'pp-semi-sock': {
			edit: 'autoconfirmed',
			reason: '[[WP:Sock puppetry|استخدام الدمى المستمر]]',
			template: 'pp-sock'
		},
		'pp-semi-protected': {
			edit: 'autoconfirmed',
			reason: null,
			template: 'pp-protected'
		},
		'pp-pc-vandalism': {
			stabilize: 'autoconfirmed', // stabilize = Pending Changes
			reason: '[[WP:Vandalism|تخريب مستمر]]',
			template: 'pp-pc'
		},
		'pp-pc-disruptive': {
			stabilize: 'autoconfirmed',
			reason: '[[WP:Disruptive editing|تحرير تخريبي مستمر]]',
			template: 'pp-pc'
		},
		'pp-pc-unsourced': {
			stabilize: 'autoconfirmed',
			reason: 'إضافة مستمرة لـ [[WP:INTREF|محتوى غير مدعوم بمصادر أو ذي مصادر ضعيفة]]',
			template: 'pp-pc'
		},
		'pp-pc-blp': {
			stabilize: 'autoconfirmed',
			reason: 'انتهاكات [[ويكيبيديا:سير الأحياء|سياسة السير الذاتية للأشخاص الأحياء]]',
			template: 'pp-pc'
		},
		'pp-pc-protected': {
			stabilize: 'autoconfirmed',
			reason: null,
			template: 'pp-pc'
		},
		'pp-move': {
			move: 'sysop',
			reason: null
		},
		'pp-move-dispute': {
			move: 'sysop',
			reason: '[[WP:MOVP|حرب نقل]]'
		},
		'pp-move-vandalism': {
			move: 'sysop',
			reason: '[[WP:MOVP|تخريب نقل الصفحات]]'
		},
		'pp-move-indef': {
			move: 'sysop',
			expiry: 'infinity',
			reason: '[[WP:MOVP|صفحة مرئية للغاية]]'
		},
		unprotect: {
			edit: 'all',
			move: 'all',
			stabilize: 'none',
			create: 'all',
			reason: null,
			template: 'none'
		},
		'pp-create-offensive': {
			create: 'sysop',
			reason: '[[WP:SALT|اسم مسيء]]'
		},
		'pp-create-salt': {
			create: 'extendedconfirmed',
			reason: '[[WP:SALT|أعيد إنشاؤه بشكل متكرر]]'
		},
		'pp-create-blp': {
			create: 'extendedconfirmed',
			reason: '[[WP:BLPDEL|سيرة شخصية محذوفة حديثًا]]'
		}
	};

	Twinkle.protect.protectionTags = [
		{
			label: 'لا شيء (إزالة قوالب الحماية الموجودة)',
			value: 'none'
		},
		{
			label: 'لا شيء (عدم إزالة قوالب الحماية الموجودة)',
			value: 'noop'
		},
		{
			label: 'قوالب حماية التعديل',
			list: [
				{ label: '{{pp-vandalism}}: تخريب', value: 'pp-vandalism' },
				{ label: '{{pp-dispute}}: نزاع/حرب تحرير', value: 'pp-dispute' },
				{ label: '{{pp-blp}}: انتهاكات BLP', value: 'pp-blp' },
				{ label: '{{pp-sock}}: استخدام الدمى', value: 'pp-sock' },
				{ label: '{{pp-template}}: قالب عالي المخاطر', value: 'pp-template' },
				{ label: '{{pp-usertalk}}: نقاش مستخدم محظور', value: 'pp-usertalk' },
				{ label: '{{pp-protected}}: حماية عامة', value: 'pp-protected' },
				{ label: '{{pp-semi-indef}}: حماية شبه دائمة طويلة الأجل', value: 'pp-semi-indef' },
				{ label: '{{pp-extended}}: حماية مؤكدة ممتدة', value: 'pp-extended' }
			]
		},
		{
			label: 'قوالب التغييرات المعلقة',
			list: [
				{ label: '{{pp-pc}}: تغييرات معلقة', value: 'pp-pc' }
			]
		},
		{
			label: 'قوالب حماية النقل',
			list: [
				{ label: '{{pp-move-dispute}}: نزاع/حرب نقل', value: 'pp-move-dispute' },
				{ label: '{{pp-move-vandalism}}: تخريب نقل الصفحات', value: 'pp-move-vandalism' },
				{ label: '{{pp-move-indef}}: عام طويل الأجل', value: 'pp-move-indef' },
				{ label: '{{pp-move}}: آخر', value: 'pp-move' }
			]
		}
	]
		// Filter FlaggedRevs
		.filter((type) => hasFlaggedRevs || type.label !== 'قوالب التغييرات المعلقة');


	Twinkle.protect.callback.changePreset = function twinkleprotectCallbackChangePreset(e) {
		const form = e.target.form;

		const actiontypes = form.actiontype;
		let actiontype;
		for (let i = 0; i < actiontypes.length; i++) {
			if (!actiontypes[i].checked) {
				continue;
			}
			actiontype = actiontypes[i].values;
			break;
		}

		if (actiontype === 'protect') { // actually protecting the page
			const item = Twinkle.protect.protectionPresetsInfo[form.category.value];

			if (mw.config.get('wgArticleId')) {
				if (item.edit) {
					form.editmodify.checked = true;
					Twinkle.protect.formevents.editmodify({ target: form.editmodify });
					form.editlevel.value = item.edit;
					Twinkle.protect.formevents.editlevel({ target: form.editlevel });
				} else {
					form.editmodify.checked = false;
					Twinkle.protect.formevents.editmodify({ target: form.editmodify });
				}

				if (item.move) {
					form.movemodify.checked = true;
					Twinkle.protect.formevents.movemodify({ target: form.movemodify });
					form.movelevel.value = item.move;
					Twinkle.protect.formevents.movelevel({ target: form.movelevel });
				} else {
					form.movemodify.checked = false;
					Twinkle.protect.formevents.movemodify({ target: form.movemodify });
				}

				form.editexpiry.value = form.moveexpiry.value = item.expiry || '2 days';

				if (form.pcmodify) {
					if (item.stabilize) {
						form.pcmodify.checked = true;
						Twinkle.protect.formevents.pcmodify({ target: form.pcmodify });
						form.pclevel.value = item.stabilize;
						Twinkle.protect.formevents.pclevel({ target: form.pclevel });
					} else {
						form.pcmodify.checked = false;
						Twinkle.protect.formevents.pcmodify({ target: form.pcmodify });
					}
					form.pcexpiry.value = item.expiry || '1 month';
				}
			} else {
				if (item.create) {
					form.createlevel.value = item.create;
					Twinkle.protect.formevents.createlevel({ target: form.createlevel });
				}
				form.createexpiry.value = item.expiry || 'infinity';
			}

			const reasonField = actiontype === 'protect' ? form.protectReason : form.reason;
			if (item.reason) {
				reasonField.value = item.reason;
			} else {
				reasonField.value = '';
			}
			// Add any annotations
			Twinkle.protect.callback.annotateProtectReason(e);

			// sort out tagging options, disabled if nonexistent, lua, or TimedText
			if (mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto' && mw.config.get('wgNamespaceNumber') !== 710) {
				if (form.category.value === 'unprotect') {
					form.tagtype.value = 'none';
				} else {
					form.tagtype.value = item.template ? item.template : form.category.value;
				}
				Twinkle.protect.formevents.tagtype({ target: form.tagtype });

				// Default settings for adding <noinclude> tags to protection templates
				const isTemplateEditorProtection = form.category.value === 'pp-template';
				const isAFD = Morebits.pageNameNorm.startsWith('Wikipedia:Articles for deletion/');
				const isNotTemplateNamespace = mw.config.get('wgNamespaceNumber') !== 10;
				const isCode = ['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'));
				if ((isTemplateEditorProtection || isAFD) && !isCode) {
					form.noinclude.checked = true;
				} else if (isCode || isNotTemplateNamespace) {
					form.noinclude.checked = false;
				}
			}

		} else { // RPP request
			if (form.category.value === 'unprotect') {
				form.expiry.value = '';
				form.expiry.disabled = true;
			} else {
				form.expiry.value = '';
				form.expiry.disabled = false;
			}
		}
	};

	Twinkle.protect.callback.evaluate = function twinkleprotectCallbackEvaluate(e) {
		const form = e.target;
		const input = Morebits.QuickForm.getInputData(form);

		let tagparams;
		if (input.actiontype === 'tag' || (input.actiontype === 'protect' && mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto' && mw.config.get('wgNamespaceNumber') !== 710 /* TimedText */)) {
			tagparams = {
				tag: input.tagtype,
				reason: false,
				small: input.small,
				noinclude: input.noinclude
			};
		}

		switch (input.actiontype) {
			case 'protect':
				// protect the page
				Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
				Morebits.wiki.actionCompleted.notice = 'اكتملت الحماية';

				var statusInited = false;
				var thispage;

				var allDone = function twinkleprotectCallbackAllDone() {
					if (thispage) {
						thispage.getStatusElement().info('تم');
					}
					if (tagparams) {
						Twinkle.protect.callbacks.taggingPageInitial(tagparams);
					}
				};

				var protectIt = function twinkleprotectCallbackProtectIt(next) {
					thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'حماية الصفحة');
					if (mw.config.get('wgArticleId')) {
						if (input.editmodify) {
							thispage.setEditProtection(input.editlevel, input.editexpiry);
						}
						if (input.movemodify) {
							// Ensure a level has actually been chosen
							if (input.movelevel) {
								thispage.setMoveProtection(input.movelevel, input.moveexpiry);
							} else {
								alert('يجب عليك اختيار مستوى لحماية النقل!');
								return;
							}
						}
						thispage.setWatchlist(Twinkle.getPref('watchProtectedPages'));
					} else {
						thispage.setCreateProtection(input.createlevel, input.createexpiry);
						thispage.setWatchlist(false);
					}

					if (input.protectReason) {
						thispage.setEditSummary(input.protectReason);
					} else {
						alert('يجب عليك إدخال سبب للحماية، والذي سيتم تسجيله في سجل الحماية.');
						return;
					}

					if (input.protectReason_notes_rfppRevid && !/^\d+$/.test(input.protectReason_notes_rfppRevid)) {
						alert('معرف المراجعة المقدم غير صحيح. يرجى الاطلاع على https://en.wikipedia.org/wiki/Help:Permanent_link للحصول على معلومات حول كيفية العثور على المعرف الصحيح (يسمى أيضًا "oldid").');
						return;
					}

					if (!statusInited) {
						Morebits.SimpleWindow.setButtonsEnabled(false);
						Morebits.Status.init(form);
						statusInited = true;
					}

					thispage.setChangeTags(Twinkle.changeTags);
					thispage.protect(next);
				};

				var stabilizeIt = function twinkleprotectCallbackStabilizeIt() {
					if (thispage) {
						thispage.getStatusElement().info('تم');
					}

					thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'تطبيق حماية التغييرات المعلقة');
					thispage.setFlaggedRevs(input.pclevel, input.pcexpiry);

					if (input.protectReason) {
						thispage.setEditSummary(input.protectReason + Twinkle.summaryAd); // flaggedrevs tag support: [[phab:T247721]]
					} else {
						alert('يجب عليك إدخال سبب للحماية، والذي سيتم تسجيله في سجل الحماية.');
						return;
					}

					if (!statusInited) {
						Morebits.SimpleWindow.setButtonsEnabled(false);
						Morebits.Status.init(form);
						statusInited = true;
					}

					thispage.setWatchlist(Twinkle.getPref('watchProtectedPages'));
					thispage.stabilize(allDone, (error) => {
						if (error.errorCode === 'stabilize_denied') { // [[phab:T234743]]
							thispage.getStatusElement().error('فشلت محاولة تعديل إعدادات التغييرات المعلقة، على الأرجح بسبب خطأ في ميدياويكي. ربما تكون الإجراءات الأخرى (وضع العلامات أو الحماية العادية) قد اتخذت. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.');
						}
					});
				};

				if (input.editmodify || input.movemodify || !mw.config.get('wgArticleId')) {
					if (input.pcmodify) {
						protectIt(stabilizeIt);
					} else {
						protectIt(allDone);
					}
				} else if (input.pcmodify) {
					stabilizeIt();
				} else {
					alert("يرجى إعطاء Twinkle شيئًا ليفعله!\nإذا كنت تريد فقط وضع علامة على الصفحة، يمكنك اختيار الخيار 'وضع قالب حماية على الصفحة' في الأعلى.");
				}

				break;

			case 'tag':
				// apply a protection template

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);

				Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
				Morebits.wiki.actionCompleted.followRedirect = false;
				Morebits.wiki.actionCompleted.notice = 'اكتمل وضع العلامات';

				Twinkle.protect.callbacks.taggingPageInitial(tagparams);
				break;

			case 'request':
				// file request at RFPP
				var typename, typereason;
				switch (input.category) {
					case 'pp-dispute':
					case 'pp-vandalism':
					case 'pp-usertalk':
					case 'pp-protected':
						typename = 'حماية كاملة';
						break;
					case 'pp-template':
						typename = 'حماية القالب';
						break;
					case 'pp-30-500-arb':
					case 'pp-30-500-vandalism':
					case 'pp-30-500-disruptive':
					case 'pp-30-500-blp':
					case 'pp-30-500-sock':
					case 'pp-30-500':
						typename = 'حماية مؤكدة ممتدة';
						break;
					case 'pp-semi-vandalism':
					case 'pp-semi-disruptive':
					case 'pp-semi-unsourced':
					case 'pp-semi-usertalk':
					case 'pp-semi-sock':
					case 'pp-semi-blp':
					case 'pp-semi-protected':
						typename = 'شبه حماية';
						break;
					case 'pp-pc-vandalism':
					case 'pp-pc-blp':
					case 'pp-pc-protected':
					case 'pp-pc-unsourced':
					case 'pp-pc-disruptive':
						typename = 'تغييرات معلقة';
						break;
					case 'pp-move':
					case 'pp-move-dispute':
					case 'pp-move-indef':
					case 'pp-move-vandalism':
						typename = 'حماية النقل';
						break;
					case 'pp-create-offensive':
					case 'pp-create-blp':
					case 'pp-create-salt':
						typename = 'حماية الإنشاء';
						break;
					case 'unprotect':
						var admins = $.map(Twinkle.protect.currentProtectionLevels, (pl) => {
							if (!pl.admin || Twinkle.protect.trustedBots.includes(pl.admin)) {
								return null;
							}
							return 'User:' + pl.admin;
						});
						if (admins.length && !confirm('هل حاولت الاتصال بمسؤولي الحماية أولاً (' + Morebits.array.uniq(admins).join(', ') + ')؟')) {
							return false;
						}
					// otherwise falls through
					default:
						typename = 'إلغاء الحماية';
						break;
				}
				switch (input.category) {
					case 'pp-dispute':
						typereason = 'نزاع محتوى/حرب تحرير';
						break;
					case 'pp-vandalism':
					case 'pp-semi-vandalism':
					case 'pp-pc-vandalism':
					case 'pp-30-500-vandalism':
						typereason = '[[ويكيبيديا:تخريب|تخريب مستمر]]';
						break;
					case 'pp-semi-disruptive':
					case 'pp-pc-disruptive':
					case 'pp-30-500-disruptive':
						typereason = '[[ويكيبيديا:تعديلات مزعجة|تحرير تخريبي مستمر]]';
						break;
					case 'pp-semi-unsourced':
					case 'pp-pc-unsourced':
						typereason = 'إضافة مستمرة لـ [[WP:INTREF|محتوى غير مدعوم بمصادر أو ذي مصادر ضعيفة]]';
						break;
					case 'pp-template':
						typereason = '[[ويكيبيديا:قوالب حساسة|قالب عالي المخاطر]]';
						break;
					case 'pp-30-500-arb':
						typereason = '[[WP:30/500|إنفاذ التحكيم]]';
						break;
					case 'pp-usertalk':
					case 'pp-semi-usertalk':
						typereason = 'استخدام غير لائق لصفحة نقاش المستخدم أثناء الحظر';
						break;
					case 'pp-semi-sock':
					case 'pp-30-500-sock':
						typereason = '[[ويكيبيديا:دمية جورب|استخدام الدمى المستمر]]';
						break;
					case 'pp-semi-blp':
					case 'pp-pc-blp':
					case 'pp-30-500-blp':
						typereason = '[[ويكيبيديا:سير الأحياء|انتهاكات سياسة BLP]]';
						break;
					case 'pp-move-dispute':
						typereason = 'نزاع عنوان الصفحة/حرب النقل';
						break;
					case 'pp-move-vandalism':
						typereason = 'تخريب نقل الصفحات';
						break;
					case 'pp-move-indef':
						typereason = 'صفحة مرئية للغاية';
						break;
					case 'pp-create-offensive':
						typereason = 'اسم مسيء';
						break;
					case 'pp-create-blp':
						typereason = '[[WP:BLPDEL|سيرة شخصية محذوفة حديثًا]]';
						break;
					case 'pp-create-salt':
						typereason = 'أعيد إنشاؤه بشكل متكرر';
						break;
					default:
						typereason = '';
						break;
				}

				var reason = typereason;
				if (input.reason !== '') {
					if (typereason !== '') {
						reason += '\u00A0\u2013 '; // U+00A0 NO-BREAK SPACE; U+2013 EN RULE
					}
					reason += input.reason;
				}
				if (reason !== '' && reason.charAt(reason.length - 1) !== '.') {
					reason += '.';
				}

				var rppparams = {
					reason: reason,
					typename: typename,
					category: input.category,
					expiry: input.expiry
				};

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);

				var rppName = 'Wikipedia:Requests for page protection/Increase';

				// Updating data for the action completed event
				Morebits.wiki.actionCompleted.redirect = 'Wikipedia: Requests for page protection';
				Morebits.wiki.actionCompleted.notice = 'اكتمل الترشيح، يتم الآن إعادة التوجيه إلى صفحة المناقشة';

				var rppPage = new Morebits.wiki.Page(rppName, 'طلب حماية الصفحة');
				rppPage.setFollowRedirect(true);
				rppPage.setCallbackParameters(rppparams);
				rppPage.load(Twinkle.protect.callbacks.fileRequest);
				break;
			default:
				alert('twinkleprotect: نوع إجراء غير معروف');
				break;
		}
	};

	Twinkle.protect.protectReasonAnnotations = [];
	Twinkle.protect.callback.annotateProtectReason = function twinkleprotectCallbackAnnotateProtectReason(e) {
		const form = e.target.form;
		const protectReason = form.protectReason.value.replace(new RegExp('(?:; )?' + mw.util.escapeRegExp(Twinkle.protect.protectReasonAnnotations.join(': '))), '');

		if (this.name === 'protectReason_notes_rfpp') {
			if (this.checked) {
				Twinkle.protect.protectReasonAnnotations.push(this.value);
				$(form.protectReason_notes_rfppRevid).parent().show();
			} else {
				Twinkle.protect.protectReasonAnnotations = [];
				form.protectReason_notes_rfppRevid.value = '';
				$(form.protectReason_notes_rfppRevid).parent().hide();
			}
		} else if (this.name === 'protectReason_notes_rfppRevid') {
			Twinkle.protect.protectReasonAnnotations = Twinkle.protect.protectReasonAnnotations.filter((el) => !el.includes('[[Special:Permalink'));
			if (e.target.value.length) {
				const permalink = '[[Special:Permalink/' + e.target.value + '#' + Morebits.pageNameNorm + ']]';
				Twinkle.protect.protectReasonAnnotations.push(permalink);
			}
		}

		if (!Twinkle.protect.protectReasonAnnotations.length) {
			form.protectReason.value = protectReason;
		} else {
			form.protectReason.value = (protectReason ? protectReason + '; ' : '') + Twinkle.protect.protectReasonAnnotations.join(': ');
		}
	};

	Twinkle.protect.callbacks = {
		taggingPageInitial: function (tagparams) {
			if (tagparams.tag === 'noop') {
				Morebits.Status.info('تطبيق قالب الحماية', 'لا يوجد شيء للقيام به');
				return;
			}

			const protectedPage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'وضع قالب على الصفحة');
			protectedPage.setCallbackParameters(tagparams);
			protectedPage.load(Twinkle.protect.callbacks.taggingPage);
		},
		taggingPage: function (protectedPage) {
			const params = protectedPage.getCallbackParameters();
			let text = protectedPage.getPageText();
			let tag, summary;

			const oldtag_re = /(?:\/\*)?\s*(?:<noinclude>)?\s*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*(?:\*\/)?\s*/gi;
			const re_result = oldtag_re.exec(text);
			if (re_result) {
				if (params.tag === 'none' || confirm('عُثر على {{' + re_result[1] + '}} في الصفحة.\nانقر فوق "موافق" لإزالته، أو انقر فوق "إلغاء" لتركه هناك.')) {
					text = text.replace(oldtag_re, '');
				}
			}

			if (params.tag === 'none') {
				summary = 'إزالة قالب الحماية';
			} else {
				tag = params.tag;
				if (params.reason) {
					tag += '|reason=' + params.reason;
				}
				if (params.small) {
					tag += '|small=yes';
				}

				if (/^\s*#redirect/i.test(text) || /^\s*#تحويل/i.test(text)) { // redirect page
					// Only tag if no {{rcat shell}} is found
					if (!text.match(/{{(?:redr|this is a redirect|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
						text = text.replace(/#REDIRECT ?(\[\[.*?\]\])(.*)/i, '#REDIRECT $1$2\n\n{{' + tag + '}}');
						text = text.replace(/#تحويل ?(\[\[.*?\]\])(.*)/i, '#تحويل $1$2\n\n{{' + tag + '}}');
					} else {
						Morebits.Status.info('غلاف فئة التحويل موجود', 'لا يوجد شيء للقيام به');
						return;
					}
				} else {
					const needsTagToBeCommentedOut = ['javascript', 'css', 'sanitized-css'].includes(protectedPage.getContentModel());
					if (needsTagToBeCommentedOut) {
						if (params.noinclude) {
							tag = '/* <noinclude>{{' + tag + '}}</noinclude> */';
						} else {
							tag = '/* {{' + tag + '}} */\n';
						}

						// Prepend tag at very top
						text = tag + text;
					} else {
						if (params.noinclude) {
							tag = '<noinclude>{{' + tag + '}}</noinclude>';

							if (text.startsWith('==')) {
								tag += '\n'; // a newline is needed to prevent section headings at the very beginning of the page from breaking
							}
						} else {
							tag = '{{' + tag + '}}\n';
						}

						// Insert tag after short description or any hatnotes
						const wikipage = new Morebits.wikitext.Page(text);
						text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
					}
				}
				summary = 'إضافة {{' + params.tag + '}}';
			}

			protectedPage.setEditSummary(summary);
			protectedPage.setChangeTags(Twinkle.changeTags);
			protectedPage.setWatchlist(Twinkle.getPref('watchPPTaggedPages'));
			protectedPage.setPageText(text);
			protectedPage.setCreateOption('nocreate');
			protectedPage.suppressProtectWarning(); // no need to let admins know they are editing through protection
			protectedPage.save();
		},

		fileRequest: function (rppPage) {

			const rppPage2 = new Morebits.wiki.Page('Wikipedia:Requests for page protection/Decrease', 'جارٍ تحميل صفحات الطلبات');
			rppPage2.load(() => {
				const params = rppPage.getCallbackParameters();
				let text = rppPage.getPageText();
				const statusElement = rppPage.getStatusElement();
				let text2 = rppPage2.getPageText();

				const rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + Morebits.string.escapeRegExp(Morebits.pageNameNorm) + '\\s*(\\]\\])?\\s*===', 'm');
				const tag = rppRe.exec(text) || rppRe.exec(text2);

				const rppLink = document.createElement('a');
				rppLink.setAttribute('href', mw.util.getUrl('Wikipedia:Requests for page protection'));
				rppLink.appendChild(document.createTextNode('Wikipedia:Requests for page protection'));

				if (tag) {
					statusElement.error(['يوجد بالفعل طلب حماية لهذه الصفحة في ', rppLink, '، أُلغي الطلب.']);
					return;
				}

				let newtag = '=== [[:' + Morebits.pageNameNorm + ']] ===\n';
				if (new RegExp('^' + mw.util.escapeRegExp(newtag).replace(/\s+/g, '\\s*'), 'm').test(text) || new RegExp('^' + mw.util.escapeRegExp(newtag).replace(/\s+/g, '\\s*'), 'm').test(text2)) {
					statusElement.error(['يوجد بالفعل طلب حماية لهذه الصفحة في ', rppLink, '، أُلغي الطلب.']);
					return;
				}
				newtag += '* {{pagelinks|1=' + Morebits.pageNameNorm + '}}\n\n';

				let words;
				switch (params.expiry) {
					case 'temporary':
						words = 'مؤقتة ';
						break;
					case 'infinity':
						words = 'غير محددة ';
						break;
					default:
						words = '';
						break;
				}

				words += params.typename;

				newtag += "'''" + Morebits.string.toUpperCaseFirstChar(words) + (params.reason !== '' ? ":''' " +
					Morebits.string.formatReasonText(params.reason) : ".'''") + ' ~~~~';

				// If either protection type results in a increased status, then post it under increase
				// else we post it under decrease
				let increase = false;
				const protInfo = Twinkle.protect.protectionPresetsInfo[params.category];

				// function to compute protection weights (see comment at Twinkle.protect.protectionWeight)
				const computeWeight = function (mainLevel, stabilizeLevel) {
					let result = Twinkle.protect.protectionWeight[mainLevel || 'all'];
					if (stabilizeLevel) {
						if (result) {
							if (stabilizeLevel.level === 'autoconfirmed') {
								result += 2;
							}
						} else {
							result = Twinkle.protect.protectionWeight['flaggedrevs_' + stabilizeLevel];
						}
					}
					return result;
				};

				// compare the page's current protection weights with the protection we are requesting
				const editWeight = computeWeight(Twinkle.protect.currentProtectionLevels.edit &&
					Twinkle.protect.currentProtectionLevels.edit.level,
					Twinkle.protect.currentProtectionLevels.stabilize &&
					Twinkle.protect.currentProtectionLevels.stabilize.level);
				if (computeWeight(protInfo.edit, protInfo.stabilize) > editWeight ||
					computeWeight(protInfo.move) > computeWeight(Twinkle.protect.currentProtectionLevels.move &&
						Twinkle.protect.currentProtectionLevels.move.level) ||
					computeWeight(protInfo.create) > computeWeight(Twinkle.protect.currentProtectionLevels.create &&
						Twinkle.protect.currentProtectionLevels.create.level)) {
					increase = true;
				}

				if (increase) {
					const originalTextLength = text.length;
					text += '\n' + newtag;
					if (text.length === originalTextLength) {
						const linknode = document.createElement('a');
						linknode.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/Fixing RPP'));
						linknode.appendChild(document.createTextNode('كيفية إصلاح RPP'));
						statusElement.error(['تعذر العثور على العنوان ذي الصلة في WP:RPP. لحل هذه المشكلة، يرجى الاطلاع على ', linknode, '.']);
						return;
					}
					statusElement.status('إضافة طلب جديد...');
					rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ طلب ' + params.typename + (params.typename === 'pending changes' ? ' على [[:' : ' لـ [[:') +
						Morebits.pageNameNorm + ']].');
					rppPage.setChangeTags(Twinkle.changeTags);
					rppPage.setPageText(text);
					rppPage.setCreateOption('recreate');
					rppPage.save(() => {
						// Watch the page being requested
						const watchPref = Twinkle.getPref('watchRequestedPages');
						// action=watch has no way to rely on user preferences (T262912), so we do it manually.
						// The watchdefault pref appears to reliably return '1' (string),
						// but that's not consistent among prefs so might as well be "correct"
						const watch = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
						if (watch) {
							const watch_query = {
								action: 'watch',
								titles: mw.config.get('wgPageName'),
								token: mw.user.tokens.get('watchToken')
							};
							// Only add the expiry if page is unwatched or already temporarily watched
							if (Twinkle.protect.watched !== true && watchPref !== 'default' && watchPref !== 'yes') {
								watch_query.expiry = watchPref;
							}
							new Morebits.wiki.Api('Adding requested page to watchlist', watch_query).post();
						}
					});
				} else {
					const originalTextLength2 = text2.length;
					text2 += '\n' + newtag;
					if (text2.length === originalTextLength2) {
						const linknode2 = document.createElement('a');
						linknode2.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/Fixing RPP'));
						linknode2.appendChild(document.createTextNode('كيفية إصلاح RPP'));
						statusElement.error(['تعذر العثور على العنوان ذي الصلة في WP:RPP. لحل هذه المشكلة، يرجى الاطلاع على ', linknode2, '.']);
						return;
					}
					statusElement.status('إضافة طلب جديد...');
					rppPage2.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ طلب ' + params.typename + (params.typename === 'pending changes' ? ' على [[:' : ' لـ [[:') +
						Morebits.pageNameNorm + ']].');
					rppPage2.setChangeTags(Twinkle.changeTags);
					rppPage2.setPageText(text2);
					rppPage2.setCreateOption('recreate');
					rppPage2.save(() => {
						// Watch the page being requested
						const watchPref = Twinkle.getPref('watchRequestedPages');
						// action=watch has no way to rely on user preferences (T262912), so we do it manually.
						// The watchdefault pref appears to reliably return '1' (string),
						// but that's not consistent among prefs so might as well be "correct"
						const watch = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
						if (watch) {
							const watch_query = {
								action: 'watch',
								titles: mw.config.get('wgPageName'),
								token: mw.user.tokens.get('watchToken')
							};
							// Only add the expiry if page is unwatched or already temporarily watched
							if (Twinkle.protect.watched !== true && watchPref !== 'default' && watchPref !== 'yes') {
								watch_query.expiry = watchPref;
							}
							new Morebits.wiki.Api('Adding requested page to watchlist', watch_query).post();
						}
					});
				}
			});
		}
	};


	Twinkle.addInitCallback(Twinkle.protect, 'protect');
}());

// </nowiki>
