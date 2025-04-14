// <nowiki>

(function () {
	const api = new mw.Api();
	let relevantUserName, blockedUserName;
	const menuFormattedNamespaces = $.extend({}, mw.config.get('wgFormattedNamespaces'));
	menuFormattedNamespaces[0] = '(مقالة)';

	/*
	 ****************************************
	 *** twinkleblock.js: Block module
	 ****************************************
	 * Mode of invocation:     Tab ("Block")
	 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
	 */

	Twinkle.block = function twinkleblock() {
		relevantUserName = mw.config.get('wgRelevantUserName');
		// should show on Contributions or Block pages, anywhere there's a relevant user
		// Ignore ranges wider than the CIDR limit
		if (Morebits.userIsSysop && relevantUserName && (!Morebits.ip.isRange(relevantUserName) || Morebits.ip.validCIDR(relevantUserName))) {
			Twinkle.addPortletLink(Twinkle.block.callback, 'منع', 'tw-block', 'منع المستخدم ذي الصلة');
		}
	};

	Twinkle.block.callback = function twinkleblockCallback() {
		if (relevantUserName === mw.config.get('wgUserName') &&
			!confirm('أنت على وشك منع نفسك! هل أنت متأكد من أنك تريد المتابعة؟')) {
			return;
		}

		Twinkle.block.currentBlockInfo = undefined;
		Twinkle.block.field_block_options = {};
		Twinkle.block.field_template_options = {};

		const Window = new Morebits.SimpleWindow(650, 530);
		// need to be verbose about who we're blocking
		Window.setTitle('منع أو إصدار قالب منع لـ ' + relevantUserName);
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('قوالب المنع', 'Template:Uw-block/doc/Block_templates');
		Window.addFooterLink('سياسة المنع', 'WP:BLOCK');
		Window.addFooterLink('تفضيلات المنع', 'WP:TW/PREF#block');
		Window.addFooterLink('مساعدة Twinkle', 'WP:TW/DOC#block');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		// Always added, hidden later if actual user not blocked
		Window.addFooterLink('إلغاء منع هذا المستخدم', 'Special:Unblock/' + relevantUserName, true);

		const form = new Morebits.QuickForm(Twinkle.block.callback.evaluate);
		const actionfield = form.append({
			type: 'field',
			label: 'نوع الإجراء'
		});
		actionfield.append({
			type: 'checkbox',
			name: 'actiontype',
			event: Twinkle.block.callback.change_action,
			list: [
				{
					label: 'منع المستخدم',
					value: 'block',
					tooltip: 'منع المستخدم ذي الصلة بالخيارات المحددة. إذا تم إلغاء تحديد المنع الجزئي، فسيكون هذا منعًا على مستوى الموقع.',
					checked: true
				},
				{
					label: 'منع جزئي',
					value: 'partial',
					tooltip: 'تمكين المنع الجزئي وقوالب المنع الجزئي.',
					checked: Twinkle.getPref('defaultToPartialBlocks') // Overridden if already blocked
				},
				{
					label: 'إضافة قالب منع إلى صفحة نقاش المستخدم',
					value: 'template',
					tooltip: 'إذا نسي مدير المنع إصدار قالب منع، أو قمت للتو بمنع المستخدم دون وضع قالب له، فيمكنك استخدام هذا لإصدار القالب المناسب. حدد مربع المنع الجزئي لقوالب المنع الجزئي.',
					// Disallow when viewing the block dialog on an IP range
					checked: !Morebits.ip.isRange(relevantUserName),
					disabled: Morebits.ip.isRange(relevantUserName)
				}
			]
		});

		/*
		  Add option for IPv6 ranges smaller than /64 to upgrade to the 64
		  CIDR ([[WP:/64]]).  This is one of the few places where we want
		  wgRelevantUserName since this depends entirely on the original user.
		  In theory, we shouldn't use Morebits.ip.get64 here since since we want
		  to exclude functionally-equivalent /64s.  That'd be:
		  // if (mw.util.isIPv6Address(mw.config.get('wgRelevantUserName'), true) &&
		  // (mw.util.isIPv6Address(mw.config.get('wgRelevantUserName')) || parseInt(mw.config.get('wgRelevantUserName').replace(/^(.+?)\/?(\d{1,3})?$/, '$2'), 10) > 64)) {
		  In practice, though, since functionally-equivalent ranges are
		  (mis)treated as separate by MediaWiki's logging ([[phab:T146628]]),
		  using Morebits.ip.get64 provides a modicum of relief in thise case.
		*/
		const sixtyFour = Morebits.ip.get64(mw.config.get('wgRelevantUserName'));
		if (sixtyFour && sixtyFour !== mw.config.get('wgRelevantUserName')) {
			const block64field = form.append({
				type: 'field',
				label: 'تحويل إلى منع نطاق /64',
				name: 'field_64'
			});
			block64field.append({
				type: 'div',
				style: 'margin-bottom: 0.5em',
				label: ['عادة ما يكون الأمر جيدًا ، إن لم يكن أفضل، أن ', $.parseHTML('<a target="_blank" href="' + mw.util.getUrl('WP:/64') + '">مجرد منع نطاق /64</a>')[0], ' (',
					$.parseHTML('<a target="_blank" href="' + mw.util.getUrl('Special:Contributions/' + sixtyFour) + '">' + sixtyFour + '</a>)')[0], ').']
			});
			block64field.append({
				type: 'checkbox',
				name: 'block64',
				event: Twinkle.block.callback.change_block64,
				list: [{
					checked: Twinkle.getPref('defaultToBlock64'),
					label: 'منع /64 بدلاً من ذلك',
					value: 'block64',
					tooltip: Morebits.ip.isRange(mw.config.get('wgRelevantUserName')) ? 'سوف تتجنب ترك قالب.' : 'سيذهب أي قالب يتم إصداره إلى عنوان IP الأصلي: ' + mw.config.get('wgRelevantUserName')
				}]
			});
		}

		form.append({ type: 'field', label: 'إعداد مسبق', name: 'field_preset' });
		form.append({ type: 'field', label: 'خيارات القالب', name: 'field_template_options' });
		form.append({ type: 'field', label: 'خيارات المنع', name: 'field_block_options' });

		form.append({ type: 'submit' });

		const result = form.render();
		Window.setContent(result);
		Window.display();
		result.root = result;

		Twinkle.block.fetchUserInfo(() => {
			// Toggle initial partial state depending on prior block type,
			// will override the defaultToPartialBlocks pref
			if (blockedUserName === relevantUserName) {
				$(result).find('[name=actiontype][value=partial]').prop('checked', Twinkle.block.currentBlockInfo.partial === '');
			}

			// clean up preset data (defaults, etc.), done exactly once, must be before Twinkle.block.callback.change_action is called
			Twinkle.block.transformBlockPresets();

			// init the controls after user and block info have been fetched
			const evt = document.createEvent('Event');
			evt.initEvent('change', true, true);

			if (result.block64 && result.block64.checked) {
				// Calls the same change_action event once finished
				result.block64.dispatchEvent(evt);
			} else {
				result.actiontype[0].dispatchEvent(evt);
			}
		});
	};

	// Store fetched user data, only relevant if switching IPv6 to a /64
	Twinkle.block.fetchedData = {};
	// Processes the data from a a query response, separated from
	// Twinkle.block.fetchUserInfo to allow reprocessing of already-fetched data
	Twinkle.block.processUserInfo = function twinkleblockProcessUserInfo(data, fn) {
		let blockinfo = data.query.blocks[0];
		const userinfo = data.query.users[0];
		// If an IP is blocked *and* rangeblocked, the above finds
		// whichever block is more recent, not necessarily correct.
		// Three seems... unlikely
		if (data.query.blocks.length > 1 && blockinfo.user !== relevantUserName) {
			blockinfo = data.query.blocks[1];
		}
		// Cache response, used when toggling /64 blocks
		Twinkle.block.fetchedData[userinfo.name] = data;

		Twinkle.block.isRegistered = !!userinfo.userid;
		if (Twinkle.block.isRegistered) {
			Twinkle.block.userIsBot = !!userinfo.groupmemberships && userinfo.groupmemberships.map((e) => e.group).includes('bot');
		} else {
			Twinkle.block.userIsBot = false;
		}

		if (blockinfo) {
			// handle frustrating system of inverted boolean values
			blockinfo.disabletalk = blockinfo.allowusertalk === undefined;
			blockinfo.hardblock = blockinfo.anononly === undefined;
		}
		// will undefine if no blocks present
		Twinkle.block.currentBlockInfo = blockinfo;
		blockedUserName = Twinkle.block.currentBlockInfo && Twinkle.block.currentBlockInfo.user;

		// Toggle unblock link if not the user in question; always first
		const unblockLink = document.querySelector('.morebits-dialog-footerlinks a');
		if (blockedUserName !== relevantUserName) {
			unblockLink.hidden = true;
			unblockLink.nextSibling.hidden = true; // link+trailing bullet
		} else {
			unblockLink.hidden = false;
			unblockLink.nextSibling.hidden = false; // link+trailing bullet
		}

		// Semi-busted on ranges, see [[phab:T270737]] and [[phab:T146628]].
		// Basically, logevents doesn't treat functionally-equivalent ranges
		// as equivalent, meaning any functionally-equivalent IP range is
		// misinterpreted by the log throughout.  Without logevents
		// redirecting (like Special:Block does) we would need a function to
		// parse ranges, which is a pain.  IPUtils has the code, but it'd be a
		// lot of cruft for one purpose.
		Twinkle.block.hasBlockLog = !!data.query.logevents.length;
		Twinkle.block.blockLog = Twinkle.block.hasBlockLog && data.query.logevents;
		// Used later to check if block status changed while filling out the form
		Twinkle.block.blockLogId = Twinkle.block.hasBlockLog ? data.query.logevents[0].logid : false;

		if (typeof fn === 'function') {
			return fn();
		}
	};

	Twinkle.block.fetchUserInfo = function twinkleblockFetchUserInfo(fn) {
		const query = {
			format: 'json',
			action: 'query',
			list: 'blocks|users|logevents',
			letype: 'block',
			lelimit: 1,
			letitle: 'User:' + relevantUserName,
			bkprop: 'expiry|reason|flags|restrictions|range|user',
			ususers: relevantUserName
		};

		// bkusers doesn't catch single IPs blocked as part of a range block
		if (mw.util.isIPAddress(relevantUserName, true)) {
			query.bkip = relevantUserName;
		} else {
			query.bkusers = relevantUserName;
			// groupmemberships only relevant for registered users
			query.usprop = 'groupmemberships';
		}

		api.get(query).then((data) => {
			Twinkle.block.processUserInfo(data, fn);
		}, (msg) => {
			Morebits.Status.init($('div[name="currentblock"] span').last()[0]);
			Morebits.Status.warn('خطأ في جلب معلومات المستخدم', msg);
		});
	};

	Twinkle.block.callback.saveFieldset = function twinkleblockCallbacksaveFieldset(fieldset) {
		Twinkle.block[$(fieldset).prop('name')] = {};
		$(fieldset).serializeArray().forEach((el) => {
			// namespaces and pages for partial blocks are overwritten
			// here, but we're handling them elsewhere so that's fine
			Twinkle.block[$(fieldset).prop('name')][el.name] = el.value;
		});
	};

	Twinkle.block.callback.change_block64 = function twinkleblockCallbackChangeBlock64(e) {
		const $form = $(e.target.form), $block64 = $form.find('[name=block64]');

		// Show/hide block64 button
		// Single IPv6, or IPv6 range smaller than a /64
		const priorName = relevantUserName;
		if ($block64.is(':checked')) {
			relevantUserName = Morebits.ip.get64(mw.config.get('wgRelevantUserName'));
		} else {
			relevantUserName = mw.config.get('wgRelevantUserName');
		}
		// No templates for ranges, but if the original user is a single IP, offer the option
		// (done separately in Twinkle.block.callback.issue_template)
		const originalIsRange = Morebits.ip.isRange(mw.config.get('wgRelevantUserName'));
		$form.find('[name=actiontype][value=template]').prop('disabled', originalIsRange).prop('checked', !originalIsRange);

		// Refetch/reprocess user info then regenerate the main content
		const regenerateForm = function () {
			// Tweak titlebar text.  In theory, we could save the dialog
			// at initialization and then use `.setTitle` or
			// `dialog('option', 'title')`, but in practice that swallows
			// the scriptName and requires `.display`ing, which jumps the
			// window.  It's just a line of text, so this is fine.
			const titleBar = document.querySelector('.ui-dialog-title').firstChild.nextSibling;
			titleBar.nodeValue = titleBar.nodeValue.replace(priorName, relevantUserName);
			// Tweak unblock link
			const unblockLink = document.querySelector('.morebits-dialog-footerlinks a');
			unblockLink.href = unblockLink.href.replace(priorName, relevantUserName);
			unblockLink.title = unblockLink.title.replace(priorName, relevantUserName);

			// Correct partial state
			$form.find('[name=actiontype][value=partial]').prop('checked', Twinkle.getPref('defaultToPartialBlocks'));
			if (blockedUserName === relevantUserName) {
				$form.find('[name=actiontype][value=partial]').prop('checked', Twinkle.block.currentBlockInfo.partial === '');
			}

			// Set content appropriately
			Twinkle.block.callback.change_action(e);
		};

		if (Twinkle.block.fetchedData[relevantUserName]) {
			Twinkle.block.processUserInfo(Twinkle.block.fetchedData[relevantUserName], regenerateForm);
		} else {
			Twinkle.block.fetchUserInfo(regenerateForm);
		}
	};

	Twinkle.block.callback.change_action = function twinkleblockCallbackChangeAction(e) {
		let field_preset, field_template_options, field_block_options;
		const $form = $(e.target.form);
		// Make ifs shorter
		const blockBox = $form.find('[name=actiontype][value=block]').is(':checked');
		const templateBox = $form.find('[name=actiontype][value=template]').is(':checked');
		const $partial = $form.find('[name=actiontype][value=partial]');
		const partialBox = $partial.is(':checked');
		let blockGroup = partialBox ? Twinkle.block.blockGroupsPartial : Twinkle.block.blockGroups;

		$partial.prop('disabled', !blockBox && !templateBox);

		// Add current block parameters as default preset
		const prior = { label: 'المنع السابق' };
		if (blockedUserName === relevantUserName) {
			Twinkle.block.blockPresetsInfo.prior = Twinkle.block.currentBlockInfo;
			// value not a valid template selection, chosen below by setting templateName
			prior.list = [{ label: 'إعدادات المنع السابقة', value: 'prior', selected: true }];

			// Arrays of objects are annoying to check
			if (!blockGroup.some((bg) => bg.label === prior.label)) {
				blockGroup.push(prior);
			}

			// Always ensure proper template exists/is selected when switching modes
			if (partialBox) {
				Twinkle.block.blockPresetsInfo.prior.templateName = Morebits.string.isInfinity(Twinkle.block.currentBlockInfo.expiry) ? 'uw-pblockindef' : 'uw-pblock';
			} else {
				if (!Twinkle.block.isRegistered) {
					Twinkle.block.blockPresetsInfo.prior.templateName = 'uw-ablock';
				} else {
					Twinkle.block.blockPresetsInfo.prior.templateName = Morebits.string.isInfinity(Twinkle.block.currentBlockInfo.expiry) ? 'uw-blockindef' : 'uw-block';
				}
			}
		} else {
			// But first remove any prior prior
			blockGroup = blockGroup.filter((bg) => bg.label !== prior.label);
		}

		// Can be in preset or template field, so the old one in the template
		// field will linger. No need to keep the old value around, so just
		// remove it; saves trouble when hiding/evaluating
		$form.find('[name=dstopic]').parent().remove();

		Twinkle.block.callback.saveFieldset($('[name=field_block_options]'));
		Twinkle.block.callback.saveFieldset($('[name=field_template_options]'));

		if (blockBox) {
			field_preset = new Morebits.QuickForm.Element({ type: 'field', label: 'إعداد مسبق', name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'preset',
				label: 'اختر إعدادًا مسبقًا:',
				event: Twinkle.block.callback.change_preset,
				list: Twinkle.block.callback.filtered_block_groups(blockGroup)
			});

			field_block_options = new Morebits.QuickForm.Element({ type: 'field', label: 'خيارات المنع', name: 'field_block_options' });
			field_block_options.append({ type: 'div', name: 'currentblock', label: ' ' });
			field_block_options.append({ type: 'div', name: 'hasblocklog', label: ' ' });
			field_block_options.append({
				type: 'select',
				name: 'expiry_preset',
				label: 'تاريخ الانتهاء:',
				event: Twinkle.block.callback.change_expiry,
				list: [
					{ label: 'مخصص', value: 'custom', selected: true },
					{ label: 'إلى أجل غير مسمى', value: 'infinity' },
					{ label: '3 ساعات', value: '3 hours' },
					{ label: '12 ساعة', value: '12 hours' },
					{ label: '24 ساعة', value: '24 hours' },
					{ label: '31 ساعة', value: '31 hours' },
					{ label: '36 ساعة', value: '36 hours' },
					{ label: '48 ساعة', value: '48 hours' },
					{ label: '60 ساعة', value: '60 hours' },
					{ label: '72 ساعة', value: '72 hours' },
					{ label: 'أسبوع واحد', value: '1 week' },
					{ label: 'أسبوعين', value: '2 weeks' },
					{ label: 'شهر واحد', value: '1 month' },
					{ label: '3 أشهر', value: '3 months' },
					{ label: '6 أشهر', value: '6 months' },
					{ label: 'سنة واحدة', value: '1 year' },
					{ label: 'سنتين', value: '2 years' },
					{ label: '3 سنوات', value: '3 years' }
				]
			});
			field_block_options.append({
				type: 'input',
				name: 'expiry',
				label: 'تاريخ انتهاء الصلاحية المخصص',
				tooltip: 'يمكنك استخدام الأوقات النسبية، مثل "دقيقة واحدة" أو "19 يومًا" ، أو الطوابع الزمنية المطلقة ، "yyyymmddhhmm" (على سبيل المثال ، "200602011405" هو 1 فبراير 2006 ، الساعة 14:05 بالتوقيت العالمي المنسق).',
				value: Twinkle.block.field_block_options.expiry || Twinkle.block.field_template_options.template_expiry
			});

			if (partialBox) { // Partial block
				field_block_options.append({
					type: 'select',
					multiple: true,
					name: 'pagerestrictions',
					label: 'صفحات محددة لمنع التحرير منها',
					value: '',
					tooltip: '10 صفحات كحد أقصى.'
				});
				const ns = field_block_options.append({
					type: 'select',
					multiple: true,
					name: 'namespacerestrictions',
					label: 'منع النطاقات المحددة',
					value: '',
					tooltip: 'منع من تعديل هذه النطاقات المحددة.'
				});
				$.each(menuFormattedNamespaces, (number, name) => {
					// Ignore -1: Special; -2: Media; and 2300-2303: Gadget (talk) and Gadget definition (talk)
					if (number >= 0 && number < 830) {
						ns.append({ type: 'option', label: name, value: number });
					}
				});
			}

			const blockoptions = [
				{
					checked: Twinkle.block.field_block_options.nocreate,
					label: 'منع إنشاء الحساب',
					name: 'nocreate',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.noemail,
					label: 'منع المستخدم من إرسال بريد إلكتروني',
					name: 'noemail',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.disabletalk,
					label: 'منع هذا المستخدم من تعديل صفحة نقاشه أثناء المنع',
					name: 'disabletalk',
					value: '1',
					tooltip: partialBox ? 'إذا كنت تصدر منعًا جزئيًا، فيجب أن يظل هذا غير محدد ما لم تمنعهم أيضًا من تعديل نطاق نقاش المستخدم' : ''
				}
			];

			if (Twinkle.block.isRegistered) {
				blockoptions.push({
					checked: Twinkle.block.field_block_options.autoblock,
					label: 'المنع التلقائي لأي عناوين IP مستخدمة (منع دائم)',
					name: 'autoblock',
					value: '1'
				});
			} else {
				blockoptions.push({
					checked: Twinkle.block.field_block_options.hardblock,
					label: 'منع المستخدمين المسجلين من استخدام عنوان IP هذا (منع دائم)',
					name: 'hardblock',
					value: '1'
				});
			}

			blockoptions.push({
				checked: Twinkle.block.field_block_options.watchuser,
				label: 'مراقبة صفحات المستخدم والمستخدم',
				name: 'watchuser',
				value: '1'
			});

			field_block_options.append({
				type: 'checkbox',
				name: 'blockoptions',
				list: blockoptions
			});
			field_block_options.append({
				type: 'textarea',
				label: 'السبب (لسجل المنع):',
				name: 'reason',
				tooltip: 'ضع في اعتبارك إضافة تفاصيل مفيدة إلى الرسالة الافتراضية.',
				value: Twinkle.block.field_block_options.reason
			});

			field_block_options.append({
				type: 'div',
				name: 'filerlog_label',
				label: 'انظر أيضا:',
				style: 'display:inline-block;font-style:normal !important',
				tooltip: 'أدخل رسالة "انظر أيضًا" للإشارة إلى ما إذا كان سجل المرشح أو المساهمات المحذوفة قد لعبت دورًا في قرار المنع.'
			});
			field_block_options.append({
				type: 'checkbox',
				name: 'filter_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block; margin-right:5px',
				list: [
					{
						label: 'سجل المرشح',
						checked: false,
						value: 'filter log'
					}
				]
			});
			field_block_options.append({
				type: 'checkbox',
				name: 'deleted_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block',
				list: [
					{
						label: 'المساهمات المحذوفة',
						checked: false,
						value: 'deleted contribs'
					}
				]
			});

			// Yet-another-logevents-doesn't-handle-ranges-well
			if (blockedUserName === relevantUserName) {
				field_block_options.append({ type: 'hidden', name: 'reblock', value: '1' });
			}
		}

		// grab discretionary sanctions list from en-wiki
		Twinkle.block.dsinfo = Morebits.wiki.getCachedJson('Template:Ds/topics.json');

		Twinkle.block.dsinfo.then((dsinfo) => {
			const $select = $('[name="dstopic"]');
			const $options = $.map(dsinfo, (value, key) => $('<option>').val(value.code).text(key).prop('label', key));
			$select.append($options);
		});

		// DS selection visible in either the template field set or preset,
		// joint settings saved here
		const dsSelectSettings = {
			type: 'select',
			name: 'dstopic',
			label: 'موضوع DS',
			value: '',
			tooltip: 'إذا تم تحديده، فسوف يقوم بإبلاغ القالب وقد تتم إضافته إلى رسالة المنع',
			event: Twinkle.block.callback.toggle_ds_reason
		};
		if (templateBox) {
			field_template_options = new Morebits.QuickForm.Element({ type: 'field', label: 'خيارات القالب', name: 'field_template_options' });
			field_template_options.append({
				type: 'select',
				name: 'template',
				label: 'اختر قالب صفحة النقاش:',
				event: Twinkle.block.callback.change_template,
				list: Twinkle.block.callback.filtered_block_groups(blockGroup, true),
				value: Twinkle.block.field_template_options.template
			});

			// Only visible for aeblock and aepblock, toggled in change_template
			field_template_options.append(dsSelectSettings);

			field_template_options.append({
				type: 'input',
				name: 'article',
				label: 'صفحة مرتبطة',
				value: '',
				tooltip: 'يمكن ربط صفحة داخل الإشعار، ربما إذا كانت الهدف الأساسي للاضطراب. اترك فارغًا حتى لا يتم ربط أي صفحة.'
			});

			// Only visible if partial and not blocking
			field_template_options.append({
				type: 'input',
				name: 'area',
				label: 'المنطقة المحظورة من',
				value: '',
				tooltip: 'شرح اختياري للصفحات أو النطاقات المحددة التي مٌنع المستخدم من تعديلها.'
			});

			if (!blockBox) {
				field_template_options.append({
					type: 'input',
					name: 'template_expiry',
					label: 'مدة المنع:',
					value: '',
					tooltip: 'الفترة التي يستحقها المنع، على سبيل المثال 24 ساعة، أسبوعان، غير محددة وما إلى ذلك...'
				});
			}
			field_template_options.append({
				type: 'input',
				name: 'block_reason',
				label: '"مُنعت بسبب ..."',
				tooltip: 'سبب اختياري، لاستبدال السبب العام الافتراضي. متاح فقط لقوالب المنع العامة.',
				value: Twinkle.block.field_template_options.block_reason
			});

			if (blockBox) {
				field_template_options.append({
					type: 'checkbox',
					name: 'blank_duration',
					list: [
						{
							label: 'عدم تضمين تاريخ انتهاء الصلاحية في القالب',
							checked: Twinkle.block.field_template_options.blank_duration,
							tooltip: 'بدلاً من تضمين المدة، اجعل قالب المنع يقرأ "لقد مُنعت مؤقتًا..."'
						}
					]
				});
			} else {
				field_template_options.append({
					type: 'checkbox',
					list: [
						{
							label: 'تم تعطيل الوصول إلى صفحة النقاش',
							name: 'notalk',
							checked: Twinkle.block.field_template_options.notalk,
							tooltip: 'اجعل قالب المنع ينص على أنه تمت إزالة وصول المستخدم إلى صفحة النقاش'
						},
						{
							label: 'تم منع المستخدم من إرسال بريد إلكتروني',
							name: 'noemail_template',
							checked: Twinkle.block.field_template_options.noemail_template,
							tooltip: 'إذا لم تُوفر المنطقة، فاجعل قالب المنع ينص على أنه تمت إزالة وصول المستخدم إلى البريد الإلكتروني'
						},
						{
							label: 'تم منع المستخدم من إنشاء حسابات',
							name: 'nocreate_template',
							checked: Twinkle.block.field_template_options.nocreate_template,
							tooltip: 'إذا لم تُوفر المنطقة، فاجعل قالب المنع ينص على أنه تمت إزالة قدرة المستخدم على إنشاء حسابات'
						}
					]
				});
			}

			const $previewlink = $('<a id="twinkleblock-preview-link">معاينة</a>');
			$previewlink.off('click').on('click', () => {
				Twinkle.block.callback.preview($form[0]);
			});
			$previewlink.css({ cursor: 'pointer' });
			field_template_options.append({ type: 'div', id: 'blockpreview', label: [$previewlink[0]] });
			field_template_options.append({ type: 'div', id: 'twinkleblock-previewbox', style: 'display: none' });
		} else if (field_preset) {
			// Only visible for arbitration enforcement, toggled in change_preset
			field_preset.append(dsSelectSettings);
		}

		let oldfield;
		if (field_preset) {
			oldfield = $form.find('fieldset[name="field_preset"]')[0];
			oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
		} else {
			$form.find('fieldset[name="field_preset"]').hide();
		}
		if (field_block_options) {
			oldfield = $form.find('fieldset[name="field_block_options"]')[0];
			oldfield.parentNode.replaceChild(field_block_options.render(), oldfield);
			$form.find('fieldset[name="field_64"]').show();

			$form.find('[name=pagerestrictions]').select2({
				theme: 'default select2-morebits',
				width: '100%',
				placeholder: 'حدد صفحات لمنع المستخدم من تعديلها',
				language: {
					errorLoading: function () {
						return 'مصطلح بحث غير مكتمل أو غير صالح';
					}
				},
				maximumSelectionLength: 10, // Software limitation [[phab:T202776]]
				minimumInputLength: 1, // prevent ajax call when empty
				ajax: {
					url: mw.util.wikiScript('api'),
					dataType: 'json',
					delay: 100,
					data: function (params) {
						const title = mw.Title.newFromText(params.term);
						if (!title) {
							return;
						}
						return {
							action: 'query',
							format: 'json',
							list: 'allpages',
							apfrom: title.title,
							apnamespace: title.namespace,
							aplimit: '10'
						};
					},
					processResults: function (data) {
						return {
							results: data.query.allpages.map((page) => {
								const title = mw.Title.newFromText(page.title, page.ns).toText();
								return {
									id: title,
									text: title
								};
							})
						};
					}
				},
				templateSelection: function (choice) {
					return $('<a>').text(choice.text).attr({
						href: mw.util.getUrl(choice.text),
						target: '_blank'
					});
				}
			});

			$form.find('[name=namespacerestrictions]').select2({
				theme: 'default select2-morebits',
				width: '100%',
				matcher: Morebits.select2.matchers.wordBeginning,
				language: {
					searching: Morebits.select2.queryInterceptor
				},
				templateResult: Morebits.select2.highlightSearchMatches,
				placeholder: 'حدد النطاقات المحددة لمنع المستخدم من'
			});

			mw.util.addCSS(
				// Reduce padding
				'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
				// Adjust font size
				'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
				'.select2-container .selection .select2-selection__rendered { font-size: 13px; }' +
				// Remove black border
				'.select2-container--default.select2-container--focus .select2-selection--multiple { border: 1px solid #aaa; }' +
				// Make the tiny cross larger
				'.select2-selection__choice__remove { font-size: 130%; }'
			);
		} else {
			$form.find('fieldset[name="field_block_options"]').hide();
			$form.find('fieldset[name="field_64"]').hide();
			// Clear select2 options
			$form.find('[name=pagerestrictions]').val(null).trigger('change');
			$form.find('[name=namespacerestrictions]').val(null).trigger('change');
		}

		if (field_template_options) {
			oldfield = $form.find('fieldset[name="field_template_options"]')[0];
			oldfield.parentNode.replaceChild(field_template_options.render(), oldfield);
			e.target.form.root.previewer = new Morebits.wiki.Preview($(e.target.form.root).find('#twinkleblock-previewbox').last()[0]);
		} else {
			$form.find('fieldset[name="field_template_options"]').hide();
		}

		// Any block, including ranges
		if (Twinkle.block.currentBlockInfo) {
			// false for an ip covered by a range or a smaller range within a larger range;
			// true for a user, single ip block, or the exact range for a range block
			const sameUser = blockedUserName === relevantUserName;

			Morebits.Status.init($('div[name="currentblock"] span').last()[0]);
			let statusStr = relevantUserName + ' هو ' + (Twinkle.block.currentBlockInfo.partial === '' ? 'محظور جزئيًا' : 'محظور على مستوى الموقع');

			// Range blocked
			if (Twinkle.block.currentBlockInfo.rangestart !== Twinkle.block.currentBlockInfo.rangeend) {
				if (sameUser) {
					statusStr += ' كمنع نطاق';
				} else {
					statusStr += ' ضمن' + (Morebits.ip.get64(relevantUserName) === blockedUserName ? ' /64' : '') + ' منع نطاق';
					// Link to the full range
					const $rangeblockloglink = $('<span>').append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: blockedUserName, type: 'block' }) + '">' + blockedUserName + '</a>)'));
					statusStr += ' (' + $rangeblockloglink.html() + ')';
				}
			}

			if (Twinkle.block.currentBlockInfo.expiry === 'infinity') {
				statusStr += ' (غير محدد)';
			} else if (new Morebits.Date(Twinkle.block.currentBlockInfo.expiry).isValid()) {
				statusStr += ' (تنتهي صلاحيته ' + new Morebits.Date(Twinkle.block.currentBlockInfo.expiry).calendar('utc') + ')';
			}

			let infoStr = 'سوف يقوم هذا النموذج';
			if (sameUser) {
				infoStr += ' بتغيير هذا المنع';
				if (Twinkle.block.currentBlockInfo.partial === undefined && partialBox) {
					infoStr += ' ، وتحويله إلى منع جزئي';
				} else if (Twinkle.block.currentBlockInfo.partial === '' && !partialBox) {
					infoStr += ' ، وتحويله إلى منع على مستوى الموقع';
				}
				infoStr += '.';
			} else {
				infoStr += ' بإضافة ' + (partialBox ? 'جزئي إضافي ' : '') + 'منع.';
			}

			Morebits.Status.warn(statusStr, infoStr);

			// Default to the current block conditions on intial form generation
			Twinkle.block.callback.update_form(e, Twinkle.block.currentBlockInfo);
		}

		// This is where T146628 really comes into play: a rangeblock will
		// only return the correct block log if wgRelevantUserName is the
		// exact range, not merely a funtional equivalent
		if (Twinkle.block.hasBlockLog) {
			const $blockloglink = $('<span>').append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: relevantUserName, type: 'block' }) + '">سجل المنع</a>)'));
			if (!Twinkle.block.currentBlockInfo) {
				const lastBlockAction = Twinkle.block.blockLog[0];
				if (lastBlockAction.action === 'unblock') {
					$blockloglink.append(' (تم إلغاء المنع ' + new Morebits.Date(lastBlockAction.timestamp).calendar('utc') + ')');
				} else { // block or reblock
					$blockloglink.append(' (' + lastBlockAction.params.duration + ', انتهت صلاحيته ' + new Morebits.Date(lastBlockAction.params.expiry).calendar('utc') + ')');
				}
			}

			Morebits.Status.init($('div[name="hasblocklog"] span').last()[0]);
			Morebits.Status.warn(Twinkle.block.currentBlockInfo ? 'المنع السابق' : 'تم منع هذا ' + (Morebits.ip.isRange(relevantUserName) ? 'نطاق' : 'مستخدم') + ' في الماضي', $blockloglink[0]);
		}

		// Make sure all the fields are correct based on initial defaults
		if (blockBox) {
			Twinkle.block.callback.change_preset(e);
		} else if (templateBox) {
			Twinkle.block.callback.change_template(e);
		}
	};

	/*
	 * Keep alphabetized by key name, Twinkle.block.blockGroups establishes
	 *    the order they will appear in the interface
	 *
	 * Block preset format, all keys accept only 'true' (omit for false) except where noted:
	 * <title of block template> : {
	 *   autoblock: <autoblock any IP addresses used (for registered users only)>
	 *   disabletalk: <disable user from editing their own talk page while blocked>
	 *   expiry: <string - expiry timestamp, can include relative times like "5 months", "2 weeks" etc>
	 *   forUnregisteredOnly: <show block option in the interface only if the relevant user is an IP>
	 *   forRegisteredOnly: <show block option in the interface only if the relevant user is registered>
	 *   label: <string - label for the option of the dropdown in the interface (keep brief)>
	 *   noemail: prevent the user from sending email through Special:Emailuser
	 *   pageParam: <set if the associated block template accepts a page parameter>
	 *   prependReason: <string - prepends the value of 'reason' to the end of the existing reason, namely for when revoking talk page access>
	 *   nocreate: <block account creation from the user's IP (for unregistered users only)>
	 *   nonstandard: <template does not conform to stewardship of WikiProject User Warnings and may not accept standard parameters>
	 *   reason: <string - block rationale, as would appear in the block log,
	 *            and the edit summary for when adding block template, unless 'summary' is set>
	 *   reasonParam: <set if the associated block template accepts a reason parameter>
	 *   sig: <string - set to ~~~~ if block template does not accept "true" as the value, or set null to omit sig param altogether>
	 *   summary: <string - edit summary for when adding block template to user's talk page, if not set, 'reason' is used>
	 *   suppressArticleInSummary: <set to suppress showing the article name in the edit summary, as with attack pages>
	 *   templateName: <string - name of template to use (instead of key name), entry will be omitted from the Templates list.
	 *                  (e.g. use another template but with different block options)>
	 *   useInitialOptions: <when preset is chosen, only change given block options, leave others as they were>
	 *
	 * WARNING: 'anononly' and 'allowusertalk' are enabled by default.
	 *   To disable, set 'hardblock' and 'disabletalk', respectively
	 */
	Twinkle.block.blockPresetsInfo = {
		anonblock: {
			expiry: '31 hours',
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{anonblock}}',
			sig: '~~~~'
		},
		'anonblock - school': {
			expiry: '36 hours',
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{anonblock}} <!-- من المحتمل أن تكون مدرسة بناءً على دليل سلوكي -->',
			templateName: 'anonblock',
			sig: '~~~~'
		},
		'blocked proxy': {
			expiry: '1 year',
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			hardblock: true,
			reason: '{{blocked proxy}}',
			sig: null
		},
		'CheckUser block': {
			expiry: '1 week',
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{CheckUser block}}',
			sig: '~~~~'
		},
		'checkuserblock-account': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{checkuserblock-account}}',
			sig: '~~~~'
		},
		'checkuserblock-wide': {
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{checkuserblock-wide}}',
			sig: '~~~~'
		},
		colocationwebhost: {
			expiry: '1 year',
			forUnregisteredOnly: true,
			nonstandard: true,
			reason: '{{colocationwebhost}}',
			sig: null
		},
		oversightblock: {
			autoblock: true,
			expiry: 'infinity',
			nocreate: true,
			nonstandard: true,
			reason: '{{OversightBlock}}',
			sig: '~~~~'
		},
		'school block': {
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{school block}}',
			sig: '~~~~'
		},
		spamblacklistblock: {
			forUnregisteredOnly: true,
			expiry: '1 month',
			disabletalk: true,
			nocreate: true,
			reason: '{{spamblacklistblock}} <!-- editor only attempts to add blacklisted links, see [[Special:Log/spamblacklist]] -->'
		},
		rangeblock: {
			reason: '{{rangeblock}}',
			nocreate: true,
			nonstandard: true,
			forUnregisteredOnly: true,
			sig: '~~~~'
		},
		tor: {
			expiry: '1 year',
			forUnregisteredOnly: true,
			nonstandard: true,
			reason: '{{Tor}}',
			sig: null
		},
		webhostblock: {
			expiry: '1 year',
			forUnregisteredOnly: true,
			nonstandard: true,
			reason: '{{webhostblock}}',
			sig: null
		},
		// uw-prefixed
		'uw-3block': {
			autoblock: true,
			expiry: '24 hours',
			nocreate: true,
			pageParam: true,
			reason: 'انتهاك [[WP:Three-revert rule|قاعدة الثلاثة استرجاعات]]',
			summary: 'مُنعت من التحرير بسبب انتهاك [[WP:3RR|قاعدة الثلاثة استرجاعات]]'
		},
		'uw-ablock': {
			autoblock: true,
			expiry: '31 hours',
			forUnregisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reasonParam: true,
			summary: 'تم منع عنوان IP الخاص بك من التحرير',
			suppressArticleInSummary: true
		},
		'uw-adblock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: 'استخدام ويكيبيديا لأغراض [[WP:Spam|البريد العشوائي]] أو [[WP:NOTADVERTISING|الإعلان]]',
			summary: 'مُنعت من التحرير بسبب [[WP:SOAP|الإعلان أو الترويج الذاتي]]'
		},
		'uw-aeblock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: '[[WP:Arbitration enforcement|إنفاذ التحكيم]]',
			reasonParam: true,
			summary: 'مُنعت من التحرير بسبب انتهاك [[WP:Arbitration|قرار التحكيم]]'
		},
		'uw-bioblock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: 'انتهاكات [[WP:Biographies of living persons|السير الذاتية للأشخاص الأحياء]]',
			summary: 'مُنعت من التحرير بسبب انتهاكات [[ويكيبيديا:سير الأحياء|سياسة السير الذاتية للأشخاص الأحياء]] في ويكيبيديا'
		},
		'uw-block': {
			autoblock: true,
			expiry: '24 hours',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reasonParam: true,
			summary: 'تم منعك من التحرير',
			suppressArticleInSummary: true
		},
		'uw-blockindef': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reasonParam: true,
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير',
			suppressArticleInSummary: true
		},
		'uw-blocknotalk': {
			disabletalk: true,
			pageParam: true,
			reasonParam: true,
			summary: 'تم منعك من التحرير وتم تعطيل الوصول إلى صفحة نقاش المستخدم الخاصة بك',
			suppressArticleInSummary: true
		},
		'uw-botblock': {
			forRegisteredOnly: true,
			pageParam: true,
			reason: 'تشغيل [[WP:BOT|نص روبوت]] بدون [[WP:BRFA|موافقة]]',
			summary: 'لقد مُنعت من التحرير لأنه يبدو أنك تقوم بتشغيل [[WP:BOT|نص روبوت]] بدون [[WP:BRFA|موافقة]]'
		},
		'uw-botublock': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-botublock}} <!-- Username implies a bot, soft block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك يعني أن هذا حساب [[WP:BOT|روبوت]] ، والذي لم تتم الموافقة عليه حاليًا'
		},
		'uw-botuhblock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: '{{uw-botuhblock}} <!-- Username implies a bot, hard block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن اسم المستخدم الخاص بك يمثل انتهاكًا صارخًا لـ [[WP:U|سياسة اسم المستخدم]]'
		},
		'uw-causeblock': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-causeblock}} <!-- Username represents a non-profit, soft block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك يعطي انطباعًا بأن الحساب يمثل مجموعة أو منظمة أو موقع ويب'
		},
		'uw-compblock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: 'حساب مخترق',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأنه يُعتقد أن [[WP:SECURE|حسابك قد تم اختراقه]]'
		},
		'uw-copyrightblock': {
			autoblock: true,
			expiry: 'infinity',
			nocreate: true,
			pageParam: true,
			reason: '[[WP:Copyright violations|انتهاكات حقوق الطبع والنشر]]',
			summary: 'مُنعت من التحرير بسبب [[WP:COPYVIO|انتهاك حقوق الطبع والنشر المستمر]]'
		},
		'uw-dblock': {
			autoblock: true,
			nocreate: true,
			reason: 'الإزالة المستمرة للمحتوى',
			pageParam: true,
			summary: 'مُنعت من التحرير بسبب [[ويكيبيديا:تخريب|الإزالة المستمرة للمواد]]'
		},
		'uw-disruptblock': {
			autoblock: true,
			nocreate: true,
			reason: '[[WP:Disruptive editing|تحرير مزعج]]',
			summary: 'مُنعت من التحرير بسبب [[WP:DE|التحرير المزعج]]'
		},
		'uw-efblock': {
			autoblock: true,
			nocreate: true,
			reason: 'تشغيل [[WP:Edit filter|مرشح التحرير]] بشكل متكرر',
			summary: 'مُنعت من التحرير بسبب التعديلات المزعجة التي أدت بشكل متكرر إلى تشغيل [[WP:EF|مرشح التحرير]]'
		},
		'uw-ewblock': {
			autoblock: true,
			expiry: '24 hours',
			nocreate: true,
			pageParam: true,
			reason: '[[WP:Edit warring|حرب التحرير]]',
			summary: 'لقد مُنعت من التحرير لمنع المزيد من [[WP:DE|التعطيل]] الناجم عن مشاركتك في [[WP:EW|حرب التحرير]]'
		},
		'uw-hblock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: '[[WP:No personal attacks|هجمات شخصية]] أو [[WP:Harassment|مضايقة]]',
			summary: 'لقد مُنعت من التحرير لمحاولة [[WP:HARASS|مضايقة]] مستخدمين آخرين'
		},
		'uw-ipevadeblock': {
			forUnregisteredOnly: true,
			nocreate: true,
			reason: '[[WP:Blocking policy#Evasion of blocks|التهرب من المنع]]',
			summary: 'تم منع عنوان IP الخاص بك من التحرير لأنه تم استخدامه [[WP:EVADE|للتهرب من منع سابق]]'
		},
		'uw-lblock': {
			autoblock: true,
			expiry: 'infinity',
			nocreate: true,
			reason: 'إصدار [[WP:No legal threats|تهديدات قانونية]]',
			summary: 'لقد مُنعت من التحرير لإصدار [[WP:NLT|تهديدات قانونية أو اتخاذ إجراء قانوني]]'
		},
		'uw-nothereblock': {
			autoblock: true,
			expiry: 'infinity',
			nocreate: true,
			reason: 'بوضوح [[WP:NOTHERE|ليس هنا لبناء موسوعة]]',
			forRegisteredOnly: true,
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأنه يبدو أنك لست هنا [[WP:NOTHERE|لبناء موسوعة]]'
		},
		'uw-npblock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: 'إنشاء [[WP:Patent nonsense|هراء واضح]] أو صفحات أخرى غير لائقة',
			summary: 'لقد مُنعت من التحرير لإنشاء [[WP:PN|صفحات غير منطقية]]'
		},
		'uw-pablock': {
			autoblock: true,
			expiry: '31 hours',
			nocreate: true,
			pageParam: true,
			reason: '[[WP:No personal attacks|هجمات شخصية]] أو [[WP:Harassment|مضايقة]]',
			summary: 'لقد مُنعت من التحرير لإجراء [[WP:NPA|هجمات شخصية]] تجاه مستخدمين آخرين'
		},
		'uw-sblock': {
			autoblock: true,
			nocreate: true,
			reason: 'استخدام ويكيبيديا لأغراض [[WP:SPAM|البريد العشوائي]]',
			summary: 'لقد مُنعت من التحرير لاستخدام ويكيبيديا لأغراض [[WP:SPAM|البريد العشوائي]]'
		},
		'uw-soablock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reason: '[[WP:Spam|البريد العشوائي]] / [[WP:NOTADVERTISING|الإعلان]] فقط',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن حسابك يستخدم فقط لـ [[WP:SPAM|البريد العشوائي أو الإعلان أو الترويج]]'
		},
		'uw-socialmediablock': {
			autoblock: true,
			nocreate: true,
			pageParam: true,
			reason: 'استخدام ويكيبيديا كـ [[WP:NOTMYSPACE|مدونة أو مضيف ويب أو موقع تواصل اجتماعي أو منتدى]]',
			summary: 'لقد مُنعت من التحرير لاستخدام صفحات المستخدم و/أو المقالات كـ [[WP:NOTMYSPACE|مدونة أو مضيف ويب أو موقع تواصل اجتماعي أو منتدى]]'
		},
		'uw-sockblock': {
			autoblock: true,
			forRegisteredOnly: true,
			nocreate: true,
			reason: 'إساءة استخدام [[WP:Sock puppetry|حسابات متعددة]]',
			summary: 'لقد مُنعت من التحرير لإساءة استخدام [[ويكيبيديا:دمية جورب|حسابات متعددة]]'
		},
		'uw-softerblock': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-softerblock}} <!-- Promotional username, soft block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك يعطي انطباعًا بأن الحساب يمثل مجموعة أو منظمة أو موقع ويب'
		},
		'uw-spamublock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: '{{uw-spamublock}} <!-- Promotional username, promotional edits -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن حسابك يستخدم فقط لـ [[WP:SPAM|البريد العشوائي أو الإعلان]] واسم المستخدم الخاص بك هو انتهاك لـ [[WP:U|سياسة اسم المستخدم]]'
		},
		'uw-spoablock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: '[[ويكيبيديا:دمية جورب|دمية جورب]]',
			summary: 'تم منع هذا الحساب باعتباره [[ويكيبيديا:دمية جورب|دمية جورب]] تم إنشاؤها لانتهاك سياسة ويكيبيديا'
		},
		'uw-talkrevoked': {
			disabletalk: true,
			reason: 'إلغاء الوصول إلى صفحة النقاش: استخدام غير لائق لصفحة نقاش المستخدم أثناء المنع',
			prependReason: true,
			summary: 'تم تعطيل الوصول إلى صفحة نقاش المستخدم الخاصة بك',
			useInitialOptions: true
		},
		'uw-ublock': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-ublock}} <!-- Username violation, soft block -->',
			reasonParam: true,
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن اسم المستخدم الخاص بك يمثل انتهاكًا لـ [[WP:U|سياسة اسم المستخدم]]'
		},
		'uw-ublock-double': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-ublock-double}} <!-- Username closely resembles another user, soft block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك مشابه جدًا لاسم المستخدم لمستخدم ويكيبيديا آخر'
		},
		'uw-ucblock': {
			autoblock: true,
			expiry: '31 hours',
			nocreate: true,
			pageParam: true,
			reason: 'الإضافة المستمرة لـ [[WP:INTREF|محتوى غير موثوق]]',
			summary: 'مُنعت من التحرير بسبب الإضافة المستمرة لـ [[WP:INTREF|محتوى غير موثوق]]'
		},
		'uw-uhblock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: '{{uw-uhblock}} <!-- Username violation, hard block -->',
			reasonParam: true,
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن اسم المستخدم الخاص بك يمثل انتهاكًا صارخًا لـ [[WP:U|سياسة اسم المستخدم]]'
		},
		'uw-ublock-wellknown': {
			expiry: 'infinity',
			forRegisteredOnly: true,
			reason: '{{uw-ublock-wellknown}} <!-- Username represents a well-known person, soft block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك يطابق اسم شخص حي معروف'
		},
		'uw-uhblock-double': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			reason: '{{uw-uhblock-double}} <!-- Attempted impersonation of another user, hard block -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن [[WP:U|اسم المستخدم]] الخاص بك يبدو أنه ينتحل شخصية مستخدم ويكيبيديا راسخ آخر'
		},
		'uw-upeblock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reason: '[[WP:PAID|تحرير مدفوع غير معلن]] في انتهاك لـ [[WP:TOU|شروط استخدام]] WMF',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن حسابك يستخدم في انتهاك [[WP:PAID|سياسة ويكيبيديا بشأن الدعوة المدفوعة غير المعلنة]]'
		},
		'uw-vaublock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reason: '{{uw-vaublock}} <!-- Username violation, vandalism-only account -->',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن حسابك [[WP:DISRUPTONLY|يستخدم فقط للتخريب]] واسم المستخدم الخاص بك هو انتهاك صارخ لـ [[WP:U|سياسة اسم المستخدم]]'
		},
		'uw-vblock': {
			autoblock: true,
			expiry: '31 hours',
			nocreate: true,
			pageParam: true,
			reason: '[[WP:Vandalism|تخريب]]',
			summary: 'لقد مُنعت من التحرير لمنع المزيد من [[ويكيبيديا:تخريب|التخريب]]'
		},
		'uw-voablock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: true,
			reason: '[[WP:DISRUPTONLY|حساب تخريبي فقط]]',
			summary: 'لقد مُنعت إلى أجل غير مسمى من التحرير لأن حسابك [[WP:DISRUPTONLY|يستخدم فقط للتخريب]]'
		},
		'zombie proxy': {
			expiry: '1 month',
			forUnregisteredOnly: true,
			nocreate: true,
			nonstandard: true,
			reason: '{{zombie proxy}}',
			sig: null
		},

		// Begin partial block templates, accessed in Twinkle.block.blockGroupsPartial
		'uw-acpblock': {
			autoblock: true,
			expiry: '48 hours',
			nocreate: true,
			pageParam: false,
			reasonParam: true,
			reason: 'إساءة استخدام [[WP:Sock puppetry|حسابات متعددة]]',
			summary: 'لقد [[WP:PB|مُنعت من إنشاء حسابات]] بسبب إساءة استخدام [[ويكيبيديا:دمية جورب|حسابات متعددة]]'
		},
		'uw-acpblockindef': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: true,
			pageParam: false,
			reasonParam: true,
			reason: 'إساءة استخدام [[WP:Sock puppetry|حسابات متعددة]]',
			summary: 'لقد [[WP:PB|مُنعت إلى أجل غير مسمى من إنشاء حسابات]] بسبب إساءة استخدام [[ويكيبيديا:دمية جورب|حسابات متعددة]]'
		},
		'uw-aepblock': {
			autoblock: true,
			nocreate: false,
			pageParam: false,
			reason: '[[WP:Arbitration enforcement|إنفاذ التحكيم]]',
			reasonParam: true,
			summary: 'لقد [[WP:PB|مُنعت جزئيًا]] من التحرير بسبب انتهاك [[WP:Arbitration|قرار التحكيم]]'
		},
		'uw-epblock': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: false,
			noemail: true,
			pageParam: false,
			reasonParam: true,
			reason: 'بريد إلكتروني [[WP:Harassment|مضايقة]]',
			summary: 'لقد [[WP:PB|مُنعت من إرسال بريد إلكتروني]] إلى محررين آخرين بسبب [[WP:Harassment|المضايقة]]'
		},
		'uw-ewpblock': {
			autoblock: true,
			expiry: '24 hours',
			nocreate: false,
			pageParam: false,
			reasonParam: true,
			reason: '[[WP:Edit warring|حرب التحرير]]',
			summary: 'لقد [[WP:PB|مُنعت جزئيًا]] من تحرير مناطق معينة من الموسوعة لمنع المزيد من [[WP:DE|التعطيل]] بسبب [[WP:EW|حرب التحرير]]'
		},
		'uw-pblock': {
			autoblock: true,
			expiry: '24 hours',
			nocreate: false,
			pageParam: false,
			reasonParam: true,
			summary: 'لقد [[WP:PB|مُنعت جزئيًا]] من مناطق معينة من الموسوعة'
		},
		'uw-pblockindef': {
			autoblock: true,
			expiry: 'infinity',
			forRegisteredOnly: true,
			nocreate: false,
			pageParam: false,
			reasonParam: true,
			summary: 'لقد [[WP:PB|مُنعت جزئيًا]] إلى أجل غير مسمى من مناطق معينة من الموسوعة'
		}
	};

	Twinkle.block.transformBlockPresets = function twinkleblockTransformBlockPresets() {
		// supply sensible defaults
		$.each(Twinkle.block.blockPresetsInfo, (preset, settings) => {
			settings.summary = settings.summary || settings.reason;
			settings.sig = settings.sig !== undefined ? settings.sig : 'yes';
			settings.indefinite = settings.indefinite || Morebits.string.isInfinity(settings.expiry);

			if (!Twinkle.block.isRegistered && settings.indefinite) {
				settings.expiry = '31 hours';
			} else {
				settings.expiry = settings.expiry || '31 hours';
			}

			Twinkle.block.blockPresetsInfo[preset] = settings;
		});
	};

	// These are the groups of presets and defines the order in which they appear. For each list item:
	//   label: <string, the description that will be visible in the dropdown>
	//   value: <string, the key of a preset in blockPresetsInfo>
	Twinkle.block.blockGroups = [
		{
			label: 'أسباب المنع الشائعة',
			list: [
				{ label: 'anonblock', value: 'anonblock' },
				{ label: 'anonblock - من المحتمل أن تكون مدرسة', value: 'anonblock - school' },
				{ label: 'منع المدرسة', value: 'school block' },
				{ label: 'منع عام (سبب مخصص)', value: 'uw-block' }, // ends up being default for registered users
				{ label: 'منع عام (سبب مخصص) - IP', value: 'uw-ablock', selected: true }, // set only when blocking IP
				{ label: 'منع عام (سبب مخصص) - غير محدد', value: 'uw-blockindef' },
				{ label: 'تحرير تخريبي', value: 'uw-disruptblock' },
				{ label: 'استخدام غير لائق لصفحة نقاش المستخدم أثناء المنع', value: 'uw-talkrevoked' },
				{ label: 'ليس هنا لبناء موسوعة', value: 'uw-nothereblock' },
				{ label: 'محتوى غير موثوق', value: 'uw-ucblock' },
				{ label: 'تخريب', value: 'uw-vblock' },
				{ label: 'حساب تخريبي فقط', value: 'uw-voablock' }
			]
		},
		{
			label: 'أسباب موسعة',
			list: [
				{ label: 'حساب للسبام أو الدعاية فقط', value: 'uw-adblock' },
				{ label: 'إنفاذ التحكيم', value: 'uw-aeblock' },
				{ label: 'التهرب من المنع - IP', value: 'uw-ipevadeblock' },
				{ label: 'انتهاكات سير الأحياء', value: 'uw-bioblock' },
				{ label: 'انتهاكات حقوق الطبع والنشر', value: 'uw-copyrightblock' },
				{ label: 'إنشاء صفحات عديمة المعنى', value: 'uw-npblock' },
				{ label: 'متعلق بمرشح التحرير', value: 'uw-efblock' },
				{ label: 'حرب التحرير', value: 'uw-ewblock' },
				{ label: 'منع عام مع إلغاء الوصول إلى صفحة النقاش', value: 'uw-blocknotalk' },
				{ label: 'مضايقة', value: 'uw-hblock' },
				{ label: 'تهديدات قانونية', value: 'uw-lblock' },
				{ label: 'هجمات شخصية أو مضايقة', value: 'uw-pablock' },
				{ label: 'حساب محتمل تم اختراقه', value: 'uw-compblock' },
				{ label: 'إزالة المحتوى', value: 'uw-dblock' },
				{ label: 'دمية جورب (رئيسي)', value: 'uw-sockblock' },
				{ label: 'دمية جورب (دمية)', value: 'uw-spoablock' },
				{ label: 'وسائل التواصل الاجتماعي', value: 'uw-socialmediablock' },
				{ label: 'رسائل غير مرغوب فيها', value: 'uw-sblock' },
				{ label: 'حساب رسائل غير مرغوب فيها/إعلانات فقط', value: 'uw-soablock' },
				{ label: 'روبوت غير معتمد', value: 'uw-botblock' },
				{ label: 'تحرير مدفوع غير معلن', value: 'uw-upeblock' },
				{ label: 'انتهاك قاعدة الثلاثة استرجاعات', value: 'uw-3block' }
			]
		},
		{
			label: 'انتهاكات اسم المستخدم',
			list: [
				{ label: 'اسم مستخدم روبوت، منع خفيف', value: 'uw-botublock' },
				{ label: 'اسم مستخدم روبوت، منع دائم', value: 'uw-botuhblock' },
				{ label: 'اسم مستخدم ترويجي، منع دائم', value: 'uw-spamublock' },
				{ label: 'اسم مستخدم ترويجي، منع خفيف', value: 'uw-softerblock' },
				{ label: 'اسم مستخدم مشابه، منع خفيف', value: 'uw-ublock-double' },
				{ label: 'انتهاك اسم المستخدم، منع خفيف', value: 'uw-ublock' },
				{ label: 'انتهاك اسم المستخدم، منع دائم', value: 'uw-uhblock' },
				{ label: 'انتحال شخصية اسم المستخدم، منع دائم', value: 'uw-uhblock-double' },
				{ label: 'اسم المستخدم يمثل شخصًا معروفًا، منع خفيف', value: 'uw-ublock-wellknown' },
				{ label: 'اسم المستخدم يمثل مؤسسة غير ربحية، منع خفيف', value: 'uw-causeblock' },
				{ label: 'انتهاك اسم المستخدم، حساب تخريبي فقط', value: 'uw-vaublock' }
			]
		},
		{
			label: 'الأسباب المقولبة',
			list: [
				{ label: 'بروكسي محظور', value: 'blocked proxy' },
				{ label: 'منع CheckUser', value: 'CheckUser block' },
				{ label: 'حساب checkuserblock', value: 'checkuserblock-account' },
				{ label: 'checkuserblock على نطاق واسع', value: 'checkuserblock-wide' },
				{ label: 'موقع ويب مشترك', value: 'colocationwebhost' },
				{ label: 'منع الرقابة', value: 'oversightblock' },
				{ label: 'منع النطاق', value: 'rangeblock' }, // Only for IP ranges, selected for non-/64 ranges in filtered_block_groups
				{ label: 'منع القائمة السوداء للبريد العشوائي', value: 'spamblacklistblock' },
				{ label: 'tor', value: 'tor' },
				{ label: 'منع مضيف الويب', value: 'webhostblock' },
				{ label: 'بروكسي الزومبي', value: 'zombie proxy' }
			]
		}
	];

	Twinkle.block.blockGroupsPartial = [
		{
			label: 'أسباب المنع الجزئي الشائعة',
			list: [
				{ label: 'منع جزئي عام (سبب مخصص)', value: 'uw-pblock', selected: true },
				{ label: 'منع جزئي عام (سبب مخصص) - غير محدد', value: 'uw-pblockindef' },
				{ label: 'حرب التحرير', value: 'uw-ewpblock' }
			]
		},
		{
			label: 'أسباب المنع الجزئي الموسعة',
			list: [
				{ label: 'إنفاذ التحكيم', value: 'uw-aepblock' },
				{ label: 'مضايقة البريد الإلكتروني', value: 'uw-epblock' },
				{ label: 'إساءة استخدام حسابات متعددة', value: 'uw-acpblock' },
				{ label: 'إساءة استخدام حسابات متعددة - غير محددة', value: 'uw-acpblockindef' }
			]
		}
	];

	Twinkle.block.callback.filtered_block_groups = function twinkleblockCallbackFilteredBlockGroups(group, show_template) {
		return $.map(group, (blockGroup) => {
			const list = $.map(blockGroup.list, (blockPreset) => {
				switch (blockPreset.value) {
					case 'uw-talkrevoked':
						if (blockedUserName !== relevantUserName) {
							return;
						}
						break;
					case 'rangeblock':
						if (!Morebits.ip.isRange(relevantUserName)) {
							return;
						}
						blockPreset.selected = !Morebits.ip.get64(relevantUserName);
						break;
					case 'CheckUser block':
					case 'checkuserblock-account':
					case 'checkuserblock-wide':
						if (!Morebits.userIsInGroup('checkuser')) {
							return;
						}
						break;
					case 'oversightblock':
						if (!Morebits.userIsInGroup('suppress')) {
							return;
						}
						break;
					default:
						break;
				}

				const blockSettings = Twinkle.block.blockPresetsInfo[blockPreset.value];

				let registrationRestrict;
				if (blockSettings.forRegisteredOnly) {
					registrationRestrict = Twinkle.block.isRegistered;
				} else if (blockSettings.forUnregisteredOnly) {
					registrationRestrict = !Twinkle.block.isRegistered;
				} else {
					registrationRestrict = true;
				}

				if (!(blockSettings.templateName && show_template) && registrationRestrict) {
					const templateName = blockSettings.templateName || blockPreset.value;
					return {
						label: (show_template ? '{{' + templateName + '}}: ' : '') + blockPreset.label,
						value: blockPreset.value,
						data: [{
							name: 'template-name',
							value: templateName
						}],
						selected: !!blockPreset.selected,
						disabled: !!blockPreset.disabled
					};
				}
			});
			if (list.length) {
				return {
					label: blockGroup.label,
					list: list
				};
			}
		});
	};

	Twinkle.block.callback.change_preset = function twinkleblockCallbackChangePreset(e) {
		const form = e.target.form, key = form.preset.value;
		if (!key) {
			return;
		}

		Twinkle.block.callback.update_form(e, Twinkle.block.blockPresetsInfo[key]);
		if (form.template) {
			form.template.value = Twinkle.block.blockPresetsInfo[key].templateName || key;
			Twinkle.block.callback.change_template(e);
		} else {
			Morebits.QuickForm.setElementVisibility(form.dstopic.parentNode, key === 'uw-aeblock' || key === 'uw-aepblock');
		}
	};

	Twinkle.block.callback.change_expiry = function twinkleblockCallbackChangeExpiry(e) {
		const expiry = e.target.form.expiry;
		if (e.target.value === 'custom') {
			Morebits.QuickForm.setElementVisibility(expiry.parentNode, true);
		} else {
			Morebits.QuickForm.setElementVisibility(expiry.parentNode, false);
			expiry.value = e.target.value;
		}
	};

	Twinkle.block.seeAlsos = [];
	Twinkle.block.callback.toggle_see_alsos = function twinkleblockCallbackToggleSeeAlso() {
		const reason = this.form.reason.value.replace(
			new RegExp('( <!--|;) انظر أيضًا ' + Twinkle.block.seeAlsos.join(' و ') + '( -->)?'), ''
		);

		Twinkle.block.seeAlsos = Twinkle.block.seeAlsos.filter((el) => el !== this.value);

		if (this.checked) {
			Twinkle.block.seeAlsos.push(this.value);
		}
		const seeAlsoMessage = Twinkle.block.seeAlsos.join(' و ');

		if (!Twinkle.block.seeAlsos.length) {
			this.form.reason.value = reason;
		} else if (reason.includes('{{')) {
			this.form.reason.value = reason + ' <!-- انظر أيضًا ' + seeAlsoMessage + ' -->';
		} else {
			this.form.reason.value = reason + '; انظر أيضًا ' + seeAlsoMessage;
		}
	};

	Twinkle.block.dsReason = '';
	Twinkle.block.callback.toggle_ds_reason = function twinkleblockCallbackToggleDSReason() {
		const reason = this.form.reason.value.replace(
			new RegExp(' ?\\(\\[\\[' + Twinkle.block.dsReason + '\\]\\]\\)'), ''
		);

		Twinkle.block.dsinfo.then((dsinfo) => {
			const sanctionCode = this.selectedIndex;
			const sanctionName = this.options[sanctionCode].label;
			Twinkle.block.dsReason = dsinfo[sanctionName].page;
			if (!this.value) {
				this.form.reason.value = reason;
			} else {
				this.form.reason.value = reason + ' ([[' + Twinkle.block.dsReason + ']])';
			}
		});
	};

	Twinkle.block.callback.update_form = function twinkleblockCallbackUpdateForm(e, data) {
		const form = e.target.form;
		let expiry = data.expiry;

		// don't override original expiry if useInitialOptions is set
		if (!data.useInitialOptions) {
			if (Date.parse(expiry)) {
				expiry = new Date(expiry).toGMTString();
				form.expiry_preset.value = 'custom';
			} else {
				form.expiry_preset.value = data.expiry || 'custom';
			}

			form.expiry.value = expiry;
			if (form.expiry_preset.value === 'custom') {
				Morebits.QuickForm.setElementVisibility(form.expiry.parentNode, true);
			} else {
				Morebits.QuickForm.setElementVisibility(form.expiry.parentNode, false);
			}
		}

		// boolean-flipped options, more at [[mw:API:Block]]
		data.disabletalk = data.disabletalk !== undefined ? data.disabletalk : false;
		data.hardblock = data.hardblock !== undefined ? data.hardblock : false;

		// disable autoblock if blocking a bot
		if (Twinkle.block.userIsBot || /bot\b/i.test(relevantUserName)) {
			data.autoblock = false;
		}

		$(form).find('[name=field_block_options]').find(':checkbox').each((i, el) => {
			// don't override original options if useInitialOptions is set
			if (data.useInitialOptions && data[el.name] === undefined) {
				return;
			}

			const check = data[el.name] === '' || !!data[el.name];
			$(el).prop('checked', check);
		});

		if (data.prependReason && data.reason) {
			form.reason.value = data.reason + '; ' + form.reason.value;
		} else {
			form.reason.value = data.reason || '';
		}

		// Clear and/or set any partial page or namespace restrictions
		if (form.pagerestrictions) {
			const $pageSelect = $(form).find('[name=pagerestrictions]');
			const $namespaceSelect = $(form).find('[name=namespacerestrictions]');

			// Respect useInitialOptions by clearing data when switching presets
			// In practice, this will always clear, since no partial presets use it
			if (!data.useInitialOptions) {
				$pageSelect.val(null).trigger('change');
				$namespaceSelect.val(null).trigger('change');
			}

			// Add any preset options; in practice, just used for prior block settings
			if (data.restrictions) {
				if (data.restrictions.pages && !$pageSelect.val().length) {
					const pages = data.restrictions.pages.map((pr) => pr.title);
					// since page restrictions use an ajax source, we
					// short-circuit that and just add a new option
					pages.forEach((page) => {
						if (!$pageSelect.find("option[value='" + $.escapeSelector(page) + "']").length) {
							const newOption = new Option(page, page, true, true);
							$pageSelect.append(newOption);
						}
					});
					$pageSelect.val($pageSelect.val().concat(pages)).trigger('change');
				}
				if (data.restrictions.namespaces) {
					$namespaceSelect.val($namespaceSelect.val().concat(data.restrictions.namespaces)).trigger('change');
				}
			}
		}
	};

	Twinkle.block.callback.change_template = function twinkleblockcallbackChangeTemplate(e) {
		const form = e.target.form, value = form.template.value, settings = Twinkle.block.blockPresetsInfo[value];

		const blockBox = $(form).find('[name=actiontype][value=block]').is(':checked');
		const partialBox = $(form).find('[name=actiontype][value=partial]').is(':checked');
		const templateBox = $(form).find('[name=actiontype][value=template]').is(':checked');

		// Block form is not present
		if (!blockBox) {
			if (settings.indefinite || settings.nonstandard) {
				if (Twinkle.block.prev_template_expiry === null) {
					Twinkle.block.prev_template_expiry = form.template_expiry.value || '';
				}
				form.template_expiry.parentNode.style.display = 'none';
				form.template_expiry.value = 'infinity';
			} else if (form.template_expiry.parentNode.style.display === 'none') {
				if (Twinkle.block.prev_template_expiry !== null) {
					form.template_expiry.value = Twinkle.block.prev_template_expiry;
					Twinkle.block.prev_template_expiry = null;
				}
				form.template_expiry.parentNode.style.display = 'block';
			}
			if (Twinkle.block.prev_template_expiry) {
				form.expiry.value = Twinkle.block.prev_template_expiry;
			}
			Morebits.QuickForm.setElementVisibility(form.notalk.parentNode, !settings.nonstandard);
			// Partial
			Morebits.QuickForm.setElementVisibility(form.noemail_template.parentNode, partialBox);
			Morebits.QuickForm.setElementVisibility(form.nocreate_template.parentNode, partialBox);
		} else if (templateBox) { // Only present if block && template forms both visible
			Morebits.QuickForm.setElementVisibility(
				form.blank_duration.parentNode,
				!settings.indefinite && !settings.nonstandard
			);
		}

		Morebits.QuickForm.setElementVisibility(form.dstopic.parentNode, value === 'uw-aeblock' || value === 'uw-aepblock');

		// Only particularly relevant if template form is present
		Morebits.QuickForm.setElementVisibility(form.article.parentNode, settings && !!settings.pageParam);
		Morebits.QuickForm.setElementVisibility(form.block_reason.parentNode, settings && !!settings.reasonParam);

		// Partial block
		Morebits.QuickForm.setElementVisibility(form.area.parentNode, partialBox && !blockBox);

		form.root.previewer.closePreview();
	};
	Twinkle.block.prev_template_expiry = null;

	Twinkle.block.callback.preview = function twinkleblockcallbackPreview(form) {
		const params = {
			article: form.article.value,
			blank_duration: form.blank_duration ? form.blank_duration.checked : false,
			disabletalk: form.disabletalk.checked || (form.notalk ? form.notalk.checked : false),
			expiry: form.template_expiry ? form.template_expiry.value : form.expiry.value,
			hardblock: Twinkle.block.isRegistered ? form.autoblock.checked : form.hardblock.checked,
			indefinite: Morebits.string.isInfinity(form.template_expiry ? form.template_expiry.value : form.expiry.value),
			reason: form.block_reason.value,
			template: form.template.value,
			dstopic: form.dstopic.value,
			partial: $(form).find('[name=actiontype][value=partial]').is(':checked'),
			pagerestrictions: $(form.pagerestrictions).val() || [],
			namespacerestrictions: $(form.namespacerestrictions).val() || [],
			noemail: form.noemail.checked || (form.noemail_template ? form.noemail_template.checked : false),
			nocreate: form.nocreate.checked || (form.nocreate_template ? form.nocreate_template.checked : false),
			area: form.area.value
		};

		const templateText = Twinkle.block.callback.getBlockNoticeWikitext(params);

		form.previewer.beginRender(templateText, 'نقاش_المستخدم:' + relevantUserName); // Force wikitext/correct username
	};

	Twinkle.block.callback.evaluate = function twinkleblockCallbackEvaluate(e) {
		const $form = $(e.target),
			toBlock = $form.find('[name=actiontype][value=block]').is(':checked'),
			toWarn = $form.find('[name=actiontype][value=template]').is(':checked'),
			toPartial = $form.find('[name=actiontype][value=partial]').is(':checked');
		let blockoptions = {}, templateoptions = {};

		Twinkle.block.callback.saveFieldset($form.find('[name=field_block_options]'));
		Twinkle.block.callback.saveFieldset($form.find('[name=field_template_options]'));

		blockoptions = Twinkle.block.field_block_options;

		templateoptions = Twinkle.block.field_template_options;

		templateoptions.disabletalk = !!(templateoptions.disabletalk || blockoptions.disabletalk);
		templateoptions.hardblock = !!blockoptions.hardblock;

		delete blockoptions.expiry_preset; // remove extraneous

		// Partial API requires this to be gone, not false or 0
		if (toPartial) {
			blockoptions.partial = templateoptions.partial = true;
		}
		templateoptions.pagerestrictions = $form.find('[name=pagerestrictions]').val() || [];
		templateoptions.namespacerestrictions = $form.find('[name=namespacerestrictions]').val() || [];
		// Format for API here rather than in saveFieldset
		blockoptions.pagerestrictions = templateoptions.pagerestrictions.join('|');
		blockoptions.namespacerestrictions = templateoptions.namespacerestrictions.join('|');

		// use block settings as warn options where not supplied
		templateoptions.summary = templateoptions.summary || blockoptions.reason;
		templateoptions.expiry = templateoptions.template_expiry || blockoptions.expiry;

		if (toBlock) {
			if (blockoptions.partial) {
				if (blockoptions.disabletalk && !blockoptions.namespacerestrictions.includes('3')) {
					return alert('لا يمكن للمنع الجزئي منع الوصول إلى صفحة النقاش ما لم يتم تقييدهم أيضًا من تعديل نطاق نقاش المستخدم!');
				}
				if (!blockoptions.namespacerestrictions && !blockoptions.pagerestrictions) {
					if (!blockoptions.noemail && !blockoptions.nocreate) { // Blank entries technically allowed [[phab:T208645]]
						return alert('لم يتم تحديد أي صفحات أو مساحات اسم، كما لم يتم تطبيق قيود على البريد الإلكتروني أو إنشاء الحساب؛ يرجى تحديد خيار واحد على الأقل لتطبيق منع جزئي!');
					} else if ((templateoptions.template !== 'uw-epblock' || $form.find('select[name="preset"]').val() !== 'uw-epblock') &&
						// Don't require confirmation if email harassment defaults are set
						!confirm('أنت على وشك المنع بدون قيود على تحرير الصفحة أو النطاق المحدد، هل أنت متأكد من أنك تريد المتابعة؟')) {
						return;
					}
				}
			}
			if (!blockoptions.expiry) {
				return alert('يرجى تقديم تاريخ انتهاء الصلاحية!');
			} else if (Morebits.string.isInfinity(blockoptions.expiry) && !Twinkle.block.isRegistered) {
				return alert("لا يمكن منع عنوان IP إلى أجل غير مسمى!");
			}
			if (!blockoptions.reason) {
				return alert('يرجى تقديم سبب للمنع!');
			}

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(e.target);
			const statusElement = new Morebits.Status('تنفيذ المنع');
			blockoptions.action = 'block';

			blockoptions.user = relevantUserName;

			// boolean-flipped options
			blockoptions.anononly = blockoptions.hardblock ? undefined : true;
			blockoptions.allowusertalk = blockoptions.disabletalk ? undefined : true;

			/*
			  Check if block status changed while processing the form.

			  There's a lot to consider here. list=blocks provides the
			  current block status, but there are at least two issues with
			  relying on it. First, the id doesn't update on a reblock,
			  meaning the individual parameters need to be compared. This
			  can be done roughly with JSON.stringify - we can thankfully
			  rely on order from the server, although sorting would be
			  fine if not - but falsey values are problematic and is
			  non-ideal. More importantly, list=blocks won't indicate if a
			  non-blocked user is blocked then unblocked. This should be
			  exceedingy rare, but regardless, we thus need to check
			  list=logevents, which has a nicely updating logid
			  parameter. We can't rely just on that, though, since it
			  doesn't account for blocks that have expired on their own.

			  As such, we use both. Using some ternaries, the logid
			  variables are false if there's no logevents, so if they
			  aren't equal we defintely have a changed entry (send
			  confirmation). If they are equal, then either the user was
			  never blocked (the block statuses will be equal, no
			  confirmation) or there's no new block, in which case either
			  a block expired (different statuses, confirmation) or the
			  same block is still active (same status, no confirmation).
			*/
			const query = {
				format: 'json',
				action: 'query',
				list: 'blocks|logevents',
				letype: 'block',
				lelimit: 1,
				letitle: 'User:' + blockoptions.user
			};
			// bkusers doesn't catch single IPs blocked as part of a range block
			if (mw.util.isIPAddress(blockoptions.user, true)) {
				query.bkip = blockoptions.user;
			} else {
				query.bkusers = blockoptions.user;
			}
			api.get(query).then((data) => {
				let block = data.query.blocks[0];
				// As with the initial data fetch, if an IP is blocked
				// *and* rangeblocked, this would only grab whichever
				// block is more recent, which would likely mean a
				// mismatch.  However, if the rangeblock is updated
				// while filling out the form, this won't detect that,
				// but that's probably fine.
				if (data.query.blocks.length > 1 && block.user !== relevantUserName) {
					block = data.query.blocks[1];
				}
				const logevents = data.query.logevents[0];
				const logid = data.query.logevents.length ? logevents.logid : false;

				if (logid !== Twinkle.block.blockLogId || !!block !== !!Twinkle.block.currentBlockInfo) {
					let message = 'تغيرت حالة المنع لـ ' + blockoptions.user + '. ';
					if (block) {
						message += 'الحالة الجديدة: ';
					} else {
						message += 'آخر إدخال: ';
					}

					let logExpiry = '';
					if (logevents.params.duration) {
						if (logevents.params.duration === 'infinity') {
							logExpiry = 'إلى أجل غير مسمى';
						} else {
							const expiryDate = new Morebits.Date(logevents.params.expiry);
							logExpiry += (expiryDate.isBefore(new Date()) ? ', انتهت صلاحيته ' : ' حتى ') + expiryDate.calendar();
						}
					} else { // no duration, action=unblock, just show timestamp
						logExpiry = ' ' + new Morebits.Date(logevents.timestamp).calendar();
					}
					message += Morebits.string.toUpperCaseFirstChar(logevents.action) + 'ed by ' + logevents.user + logExpiry +
						' بسبب "' + logevents.comment + '". هل تريد التجاوز بإعداداتك؟';

					if (!confirm(message)) {
						Morebits.Status.info('تنفيذ المنع', 'تم الإلغاء من قبل المستخدم');
						return;
					}
					blockoptions.reblock = 1; // Writing over a block will fail otherwise
				}

				// execute block
				blockoptions.tags = Twinkle.changeTags;
				blockoptions.token = mw.user.tokens.get('csrfToken');
				const mbApi = new Morebits.wiki.Api('تنفيذ المنع', blockoptions, (() => {
					statusElement.info('اكتمل');
					if (toWarn) {
						Twinkle.block.callback.issue_template(templateoptions);
					}
				}));
				mbApi.post();
			});
		} else if (toWarn) {
			Morebits.SimpleWindow.setButtonsEnabled(false);

			Morebits.Status.init(e.target);
			Twinkle.block.callback.issue_template(templateoptions);
		} else {
			return alert('يرجى إعطاء Twinkle شيئًا لتفعله!');
		}
	};

	Twinkle.block.callback.issue_template = function twinkleblockCallbackIssueTemplate(formData) {
		// Use wgRelevantUserName to ensure the block template goes to a single IP and not to the
		// "talk page" of an IP range (which does not exist)
		const userTalkPage = 'نقاش_المستخدم:' + mw.config.get('wgRelevantUserName');

		const params = Twinkle.block.combineFormDataAndFieldTemplateOptions(
			formData,
			Twinkle.block.blockPresetsInfo[formData.template],
			Twinkle.block.field_template_options.block_reason,
			Twinkle.block.field_template_options.notalk,
			Twinkle.block.field_template_options.noemail_template,
			Twinkle.block.field_template_options.nocreate_template
		);

		Morebits.wiki.actionCompleted.redirect = userTalkPage;
		Morebits.wiki.actionCompleted.notice = 'اكتملت الإجراءات، ويتم تحميل صفحة نقاش المستخدم في بضع ثوان';

		const wikipedia_page = new Morebits.wiki.Page(userTalkPage, 'تعديل صفحة نقاش المستخدم');
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.block.callback.main);
	};

	Twinkle.block.combineFormDataAndFieldTemplateOptions = function (formData, messageData, reason, disabletalk, noemail, nocreate) {
		return $.extend(formData, {
			messageData: messageData,
			reason: reason,
			disabletalk: disabletalk,
			noemail: noemail,
			nocreate: nocreate
		});
	};

	Twinkle.block.callback.getBlockNoticeWikitext = function (params) {
		let text = '{{';
		const settings = Twinkle.block.blockPresetsInfo[params.template];
		if (!settings.nonstandard) {
			text += 'subst:' + params.template;
			if (params.article && settings.pageParam) {
				text += '|page=' + params.article;
			}
			if (params.dstopic) {
				text += '|topic=' + params.dstopic;
			}

			if (!/te?mp|^\s*$|min/.exec(params.expiry)) {
				if (params.indefinite) {
					text += '|indef=yes';
				} else if (!params.blank_duration && !new Morebits.Date(params.expiry).isValid()) {
					// Block template wants a duration, not date
					text += '|time=' + params.expiry;
				}
			}

			if (!Twinkle.block.isRegistered && !params.hardblock) {
				text += '|anon=yes';
			}

			if (params.reason) {
				text += '|reason=' + params.reason;
			}
			if (params.disabletalk) {
				text += '|notalk=yes';
			}

			// Currently, all partial block templates are "standard"
			// Building the template, however, takes a fair bit of logic
			if (params.partial) {
				if (params.pagerestrictions.length || params.namespacerestrictions.length) {
					const makeSentence = function (array) {
						if (array.length < 3) {
							return array.join(' and ');
						}
						const last = array.pop();
						return array.join(', ') + ', و ' + last;

					};
					text += '|area=' + (params.indefinite ? 'معين' : 'من معين ');
					if (params.pagerestrictions.length) {
						text += 'صفحات (' + makeSentence(params.pagerestrictions.map((p) => '[[:' + p + ']]'));
						text += params.namespacerestrictions.length ? ') وبعض ' : ')';
					}
					if (params.namespacerestrictions.length) {
						// 1 => Talk, 2 => User, etc.
						const namespaceNames = params.namespacerestrictions.map((id) => menuFormattedNamespaces[id]);
						text += '[[ويكيبيديا:نطاق|النطاقات]] (' + makeSentence(namespaceNames) + ')';
					}
				} else if (params.area) {
					text += '|area=' + params.area;
				} else {
					if (params.noemail) {
						text += '|email=yes';
					}
					if (params.nocreate) {
						text += '|accountcreate=yes';
					}
				}
			}
		} else {
			text += params.template;
		}

		if (settings.sig) {
			text += '|sig=' + settings.sig;
		}
		return text + '}}';
	};

	Twinkle.block.callback.main = function twinkleblockcallbackMain(pageobj) {
		const params = pageobj.getCallbackParameters(),
			date = new Morebits.Date(pageobj.getLoadTime()),
			messageData = params.messageData;
		let text;

		params.indefinite = Morebits.string.isInfinity(params.expiry);

		if (Twinkle.getPref('blankTalkpageOnIndefBlock') && params.template !== 'uw-lblock' && params.indefinite) {
			Morebits.Status.info('Info', 'تفريغ صفحة النقاش وفقًا للتفضيلات وإنشاء قسم جديد في صفحة النقاش لهذا الشهر');
			text = date.monthHeader() + '\n';
		} else {
			text = pageobj.getPageText();

			const dateHeaderRegex = date.monthHeaderRegex();
			let dateHeaderRegexLast, dateHeaderRegexResult;
			while ((dateHeaderRegexLast = dateHeaderRegex.exec(text)) !== null) {
				dateHeaderRegexResult = dateHeaderRegexLast;
			}
			// If dateHeaderRegexResult is null then lastHeaderIndex is never checked. If it is not null but
			// \n== is not found, then the date header must be at the very start of the page. lastIndexOf
			// returns -1 in this case, so lastHeaderIndex gets set to 0 as desired.
			const lastHeaderIndex = text.lastIndexOf('\n==') + 1;

			if (text.length > 0) {
				text += '\n\n';
			}

			if (!dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex) {
				Morebits.Status.info('Info', 'سيتم إنشاء قسم جديد في صفحة النقاش لهذا الشهر، حيث لم يُعثر على قسم');
				text += date.monthHeader() + '\n';
			}
		}

		params.expiry = typeof params.template_expiry !== 'undefined' ? params.template_expiry : params.expiry;

		text += Twinkle.block.callback.getBlockNoticeWikitext(params);

		// build the edit summary
		let summary = messageData.summary;
		if (messageData.suppressArticleInSummary !== true && params.article) {
			summary += ' على [[:' + params.article + ']]';
		}
		summary += '.';

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('watchWarnings'));
		pageobj.save();
	};

	Twinkle.addInitCallback(Twinkle.block, 'block');
}());

// </nowiki>
