// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinklewelcome.js: Welcome module
	 ****************************************
	 * Mode of invocation:     Tab ("Wel"), or from links on diff pages
	 * Active on:              Any page with relevant user name (userspace,
	 *                         contribs, etc.) and diff pages
	 */
	Twinkle.welcome = function twinklewelcome() {
		if (Twinkle.getPrefill('twinklewelcome')) {
			if (Twinkle.getPrefill('twinklewelcome') === 'auto') {
				Twinkle.welcome.auto();
			} else {
				Twinkle.welcome.semiauto();
			}
		} else {
			Twinkle.welcome.normal();
		}
	};

	Twinkle.welcome.auto = function () {
		if (mw.util.getParamValue('action') !== 'edit') {
			// userpage not empty, aborting auto-welcome
			return;
		}

		Twinkle.welcome.welcomeUser();
	};

	Twinkle.welcome.semiauto = function () {
		Twinkle.welcome.callback(mw.config.get('wgRelevantUserName'));
	};

	Twinkle.welcome.normal = function () {
		const isDiff = mw.util.getParamValue('diff');
		if (isDiff) {
			// check whether the contributors' talk pages exist yet
			const $oldDiffUsernameLine = $('#mw-diff-otitle2');
			const $newDiffUsernameLine = $('#mw-diff-ntitle2');
			const $oldDiffHasRedlinkedTalkPage = $oldDiffUsernameLine.find('span.mw-usertoollinks a.new:contains(talk)').first();
			const $newDiffHasRedlinkedTalkPage = $newDiffUsernameLine.find('span.mw-usertoollinks a.new:contains(talk)').first();

			const diffHasRedlinkedTalkPage = $oldDiffHasRedlinkedTalkPage.length > 0 || $newDiffHasRedlinkedTalkPage.length > 0;
			if (diffHasRedlinkedTalkPage) {
				const spanTag = function (color, content) {
					const span = document.createElement('span');
					span.style.color = color;
					span.appendChild(document.createTextNode(content));
					return span;
				};

				const welcomeNode = document.createElement('strong');
				const welcomeLink = document.createElement('a');
				welcomeLink.appendChild(spanTag('Black', '['));
				welcomeLink.appendChild(spanTag('Goldenrod', 'welcome'));
				welcomeLink.appendChild(spanTag('Black', ']'));
				welcomeNode.appendChild(welcomeLink);

				if ($oldDiffHasRedlinkedTalkPage.length > 0) {
					const oHref = $oldDiffHasRedlinkedTalkPage.attr('href');

					const oWelcomeNode = welcomeNode.cloneNode(true);
					oWelcomeNode.firstChild.setAttribute('href', oHref + '&' + $.param({
						twinklewelcome: Twinkle.getPref('quickWelcomeMode') === 'auto' ? 'auto' : 'norm',
						vanarticle: Morebits.pageNameNorm
					}));
					$oldDiffHasRedlinkedTalkPage[0].parentNode.parentNode.appendChild(document.createTextNode(' '));
					$oldDiffHasRedlinkedTalkPage[0].parentNode.parentNode.appendChild(oWelcomeNode);
				}

				if ($newDiffHasRedlinkedTalkPage.length > 0) {
					const nHref = $newDiffHasRedlinkedTalkPage.attr('href');

					const nWelcomeNode = welcomeNode.cloneNode(true);
					nWelcomeNode.firstChild.setAttribute('href', nHref + '&' + $.param({
						twinklewelcome: Twinkle.getPref('quickWelcomeMode') === 'auto' ? 'auto' : 'norm',
						vanarticle: Morebits.pageNameNorm
					}));
					$newDiffHasRedlinkedTalkPage[0].parentNode.parentNode.appendChild(document.createTextNode(' '));
					$newDiffHasRedlinkedTalkPage[0].parentNode.parentNode.appendChild(nWelcomeNode);
				}
			}
		}
		// Users and IPs but not IP ranges
		if (mw.config.exists('wgRelevantUserName') && !Morebits.ip.isRange(mw.config.get('wgRelevantUserName'))) {
			Twinkle.addPortletLink(() => {
				Twinkle.welcome.callback(mw.config.get('wgRelevantUserName'));
			}, 'ترحيب', 'twinkle-welcome', 'ترحيب بالمستخدم');
		}
	};


	Twinkle.welcome.welcomeUser = function welcomeUser() {
		Morebits.Status.init(document.getElementById('mw-content-text'));
		$('#catlinks').remove();

		const params = {
			template: Twinkle.getPref('quickWelcomeTemplate'),
			article: Twinkle.getPrefill('vanarticle') || '',
			mode: 'auto'
		};

		const userTalkPage = mw.config.get('wgFormattedNamespaces')[3] + ':' + mw.config.get('wgRelevantUserName');
		Morebits.wiki.actionCompleted.redirect = userTalkPage;
		Morebits.wiki.actionCompleted.notice = 'اكتمل الترحيب، وإعادة تحميل صفحة النقاش في بضع ثوان';

		const wikipedia_page = new Morebits.wiki.Page(userTalkPage, 'تعديل صفحة نقاش المستخدم');
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.welcome.callbacks.main);
	};

	Twinkle.welcome.callback = function twinklewelcomeCallback(uid) {
		if (uid === mw.config.get('wgUserName') && !confirm('هل أنت متأكد حقًا من أنك تريد الترحيب بنفسك؟...')) {
			return;
		}

		const Window = new Morebits.SimpleWindow(600, 420);
		Window.setTitle('ترحيب بالمستخدم');
		Window.setScriptName('لمح البصر!');
		Window.addFooterLink('لجنة الترحيب', 'ويكيبيديا:لجنة الترحيب');
		Window.addFooterLink('تفضيلات الترحيب', 'ويكيبيديا:Twinkle/Preferences#welcome');
		Window.addFooterLink('مساعدة لمح البصر!', 'ويكيبيديا:لمح البصر/توثيق#welcome');
		Window.addFooterLink('إعطاء ملاحظات', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.welcome.callback.evaluate);

		form.append({
			type: 'select',
			name: 'type',
			label: 'نوع الترحيب:',
			event: Twinkle.welcome.populateWelcomeList,
			list: [
				{ type: 'option', value: 'standard', label: 'ترحيبات قياسية', selected: !mw.util.isIPAddress(mw.config.get('wgRelevantUserName')) },
				{ type: 'option', value: 'unregistered', label: 'ترحيبات مستخدم IP', selected: mw.util.isIPAddress(mw.config.get('wgRelevantUserName')) },
				{ type: 'option', value: 'wikiProject', label: 'ترحيبات WikiProject' },
				{ type: 'option', value: 'nonEnglish', label: 'ترحيبات غير إنجليزية' }
			]
		});

		form.append({
			type: 'div',
			id: 'welcomeWorkArea',
			className: 'morebits-scrollbox'
		});

		form.append({
			type: 'input',
			name: 'article',
			label: '* مقالة مرتبطة (إذا كان القالب يدعمها):',
			value: Twinkle.getPrefill('vanarticle') || '',
			tooltip: 'قد يتم ربط مقالة من داخل الترحيب إذا كان القالب يدعمه. اترك فارغًا حتى لا يتم ربط أي مقالة. يتم وضع علامة النجمة على القوالب التي تدعم مقالة مرتبطة.'
		});

		const previewlink = document.createElement('a');
		$(previewlink).on('click', () => {
			Twinkle.welcome.callbacks.preview(result); // |result| is defined below
		});
		previewlink.style.cursor = 'pointer';
		previewlink.textContent = 'معاينة';
		form.append({ type: 'div', name: 'welcomepreview', label: [previewlink] });

		form.append({ type: 'submit' });

		var result = form.render();
		Window.setContent(result);
		Window.display();

		// initialize the welcome list
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.type.dispatchEvent(evt);
	};

	Twinkle.welcome.populateWelcomeList = function (e) {
		const type = e.target.value;

		const container = new Morebits.QuickForm.Element({ type: 'fragment' });

		if ((type === 'standard' || type === 'unregistered') && Twinkle.getPref('customWelcomeList').length) {
			container.append({ type: 'header', label: 'قوالب ترحيب مخصصة' });
			container.append({
				type: 'radio',
				name: 'template',
				list: Twinkle.getPref('customWelcomeList'),
				event: function () {
					e.target.form.article.disabled = false;
				}
			});
		}

		const sets = Twinkle.welcome.templates[type];
		$.each(sets, (label, templates) => {
			container.append({ type: 'header', label: label });
			container.append({
				type: 'radio',
				name: 'template',
				list: $.map(templates, (properties, template) => ({
					value: template,
					label: '{{' + template + '}}: ' + properties.description + (properties.linkedArticle ? '\u00A0*' : ''), // U+00A0 NO-BREAK SPACE
					tooltip: properties.tooltip // may be undefined
				})),
				event: function (ev) {
					ev.target.form.article.disabled = !templates[ev.target.value].linkedArticle;
				}
			});
		});

		const rendered = container.render();
		$(e.target.form).find('div#welcomeWorkArea').empty().append(rendered);

		const firstRadio = e.target.form.template[0];
		firstRadio.checked = true;
		const vals = Object.values(sets)[0];
		e.target.form.article.disabled = vals[firstRadio.value] ? !vals[firstRadio.value].linkedArticle : true;
	};
	// A list of welcome templates and their properties and syntax

	// The four fields that are available are "description", "linkedArticle", "syntax", and "tooltip".
	// The three magic words that can be used in the "syntax" field are:
	//   - $USERNAME$  - replaced by the welcomer's username, depending on user's preferences
	//   - $ARTICLE$   - replaced by an article name, if "linkedArticle" is true
	//   - $HEADER$    - adds a level 2 header (most templates already include this)
	//   - $EXTRA$     - custom message to be added at the end of the template. not implemented yet.

	Twinkle.welcome.templates = {
		standard: {
			'قوالب الترحيب العامة': {
				welcome: {
					description: 'ترحيب قياسي',
					linkedArticle: true,
					syntax: '{{subst:welcome|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-retro': {
					description: 'رسالة ترحيب مع قائمة صغيرة من الروابط المفيدة',
					linkedArticle: true,
					syntax: '{{subst:welcome-retro|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-short': {
					description: 'رسالة ترحيب أقصر',
					syntax: '{{subst:W-short|$EXTRA$}}'
				},
				'welcome-cookie': {
					description: 'رسالة ترحيب مع بعض الروابط المفيدة وصفيحة من ملفات تعريف الارتباط',
					syntax: '{{subst:welcome cookie}} ~~~~'
				},
				welcoming: {
					description: 'رسالة ترحيب مع روابط الدروس ونصائح التحرير الأساسية',
					syntax: '{{subst:Welcoming}}'
				}
			},

			'قوالب ترحيب محددة': {
				'welcome-belated': {
					description: 'ترحيب للمستخدمين ذوي المساهمات الكبيرة',
					syntax: '{{subst:welcome-belated|$USERNAME$}}'
				},
				'welcome student': {
					description: 'ترحيب للطلاب الذين يقومون بالتحرير كجزء من مشروع فصل دراسي تعليمي',
					syntax: '$HEADER$ {{subst:welcome student|$USERNAME$}} ~~~~'
				},
				'welcome teacher': {
					description: 'ترحيب للمدربين المشاركين في مشروع فصل دراسي تعليمي',
					syntax: '$HEADER$ {{subst:welcome teacher|$USERNAME$}} ~~~~'
				},
				'welcome non-latin': {
					description: 'ترحيب للمستخدمين الذين لديهم اسم مستخدم يحتوي على أحرف غير لاتينية',
					syntax: '{{subst:welcome non-latin|$USERNAME$}} ~~~~'
				},
				'welcome mentor': {
					description: 'ترحيب للمستخدمين المرشدين لتقديمه لطلابهم',
					syntax: '{{subst:mentor welcome|$USERNAME$}} ~~~~'
				},
				'welcome draft': {
					description: 'ترحيب للمستخدمين الذين يكتبون مقالات مسودة',
					linkedArticle: true,
					syntax: '{{subst:welcome draft|art=$ARTICLE$}} ~~~~'
				}
			},

			'قوالب الترحيب الخاصة بمستخدم لديه مشكلة': {
				'first article': {
					description: 'لشخص لم تستوف مقالته الأولى إرشادات إنشاء الصفحة',
					linkedArticle: true,
					syntax: '{{subst:first article|$ARTICLE$|$USERNAME$}}'
				},
				'welcome-COI': {
					description: 'لشخص قام بالتحرير في مناطق قد يكون لديه فيها تضارب في المصالح',
					linkedArticle: true,
					syntax: '{{subst:welcome-COI|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-auto': {
					description: 'لشخص أنشأ مقالاً عن السيرة الذاتية',
					linkedArticle: true,
					syntax: '{{subst:welcome-auto|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-copyright': {
					description: 'لشخص كان يضيف انتهاكات حقوق الطبع والنشر إلى المقالات',
					linkedArticle: true,
					syntax: '{{subst:welcome-copyright|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				'welcome-delete': {
					description: 'لشخص كان يزيل معلومات من المقالات',
					linkedArticle: true,
					syntax: '{{subst:welcome-delete|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				'welcome-image': {
					description: 'ترحيب بمعلومات إضافية حول الصور (السياسة والإجراءات)',
					linkedArticle: true,
					syntax: '{{subst:welcome-image|$USERNAME$|art=$ARTICLE$}}'
				},
				'welcome-unsourced': {
					description: 'لشخص كانت جهوده الأولية غير موثقة',
					linkedArticle: true,
					syntax: '{{subst:welcome-unsourced|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				welcomelaws: {
					description: 'ترحيب بمعلومات حول حقوق الطبع والنشر وNPOV والميدان والتخريب',
					syntax: '{{subst:welcomelaws|$USERNAME$}} ~~~~'
				},
				welcomenpov: {
					description: 'لشخص لم تلتزم جهوده الأولية بسياسة وجهة النظر المحايدة',
					linkedArticle: true,
					syntax: '{{subst:welcomenpov|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				welcomevandal: {
					description: 'لشخص بدت جهوده الأولية وكأنها تخريب',
					linkedArticle: true,
					syntax: '{{subst:welcomevandal|$ARTICLE$|$USERNAME$}}'
				},
				welcomespam: {
					description: 'ترحيب مع مناقشة إضافية لسياسات مكافحة الرسائل غير المرغوب فيها',
					linkedArticle: true,
					syntax: '{{subst:welcomespam|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				welcometest: {
					description: 'لشخص بدت جهوده الأولية وكأنها اختبارات',
					linkedArticle: true,
					syntax: '{{subst:welcometest|$ARTICLE$|$USERNAME$}} ~~~~'
				}
			}
		},

		unregistered: {
			'قوالب ترحيب المستخدمين غير المسجلين': {
				'welcome-unregistered': {
					description: 'للمستخدمين غير المسجلين؛ تشجع على إنشاء حساب',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered|art=$ARTICLE$}} ~~~~'
				},
				thanks: {
					description: 'للمستخدمين غير المسجلين؛ قصير؛ يشجع على إنشاء حساب',
					linkedArticle: true,
					syntax: '== اهلا بك! ==\n{{subst:thanks|page=$ARTICLE$}} ~~~~'
				},
				'welcome-unregistered-test': {
					description: 'للمستخدمين غير المسجلين الذين قاموا بإجراء تعديلات تجريبية',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered-test|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				'welcome-unregistered-unconstructive': {
					description: 'للمستخدمين غير المسجلين الذين قاموا بتخريب أو إجراء تعديلات غير مفيدة',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered-unconstructive|$ARTICLE$|$USERNAME$}}'
				},
				'welcome-unregistered-constructive': {
					description: 'للمستخدمين غير المسجلين الذين يكافحون التخريب أو التحرير بشكل بناء',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered-constructive|art=$ARTICLE$}}'
				},
				'welcome-unregistered-delete': {
					description: 'للمستخدمين غير المسجلين الذين أزالوا محتوى من الصفحات',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered-delete|$ARTICLE$|$USERNAME$}} ~~~~'
				},
				'welcome-unregistered-unsourced': {
					description: 'للمستخدمين المجهولين الذين أضافوا محتوى غير موثوق',
					linkedArticle: true,
					syntax: '{{subst:welcome-unregistered-unsourced|$ARTICLE$|$USERNAME$}}'
				}
			}
		},

		wikiProject: {
			'قوالب الترحيب الخاصة بـ WikiProject': {
				'TWA invite': {
					description: 'ادع المستخدم إلى The Wikipedia Adventure (ليس قالب ترحيب)',
					syntax: '{{subst:WP:TWA/InviteTW|signature=~~~~}}'
				},
				'welcome-anatomy': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات التشريح',
					syntax: '{{subst:welcome-anatomy}} ~~~~'
				},
				'welcome-athletics': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات ألعاب القوى (المضمار والميدان)',
					syntax: '{{subst:welcome-athletics}}'
				},
				'welcome-au': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات أستراليا',
					syntax: '{{subst:welcome-au}} ~~~~'
				},
				'welcome-bd': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات بنغلاديش',
					linkedArticle: true,
					syntax: '{{subst:welcome-bd|$USERNAME$||$EXTRA$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-bio': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات السيرة الذاتية',
					syntax: '{{subst:welcome-bio}} ~~~~'
				},
				'welcome-cal': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات كاليفورنيا',
					syntax: '{{subst:welcome-cal}} ~~~~'
				},
				'welcome-conserv': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات المحافظة',
					syntax: '{{subst:welcome-conserv}}'
				},
				'welcome-cycling': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات ركوب الدراجات',
					syntax: '{{subst:welcome-cycling}} ~~~~'
				},
				'welcome-dbz': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات Dragon Ball',
					syntax: '{{subst:welcome-dbz|$EXTRA$|sig=~~~~}}'
				},
				'welcome-et': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات إستونيا',
					syntax: '{{subst:welcome-et}}'
				},
				'welcome-de': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات ألمانيا',
					syntax: '{{subst:welcome-de}} ~~~~'
				},
				'welcome-in': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات الهند',
					linkedArticle: true,
					syntax: '{{subst:welcome-in|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-math': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بالموضوعات الرياضية',
					linkedArticle: true,
					syntax: '{{subst:welcome-math|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-med': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات الطب',
					linkedArticle: true,
					syntax: '{{subst:welcome-med|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-no': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات النرويج',
					syntax: '{{subst:welcome-no}} ~~~~'
				},
				'welcome-pk': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات باكستان',
					linkedArticle: true,
					syntax: '{{subst:welcome-pk|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-phys': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات الفيزياء',
					linkedArticle: true,
					syntax: '{{subst:welcome-phys|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-pl': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات بولندا',
					syntax: '{{subst:welcome-pl}} ~~~~'
				},
				'welcome-rugbyunion': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات اتحاد الرغبي',
					syntax: '{{subst:welcome-rugbyunion}} ~~~~'
				},
				'welcome-ru': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات روسيا',
					syntax: '{{subst:welcome-ru}} ~~~~'
				},
				'welcome-starwars': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات حرب النجوم',
					syntax: '{{subst:welcome-starwars}} ~~~~'
				},
				'welcome-ch': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات سويسرا',
					linkedArticle: true,
					syntax: '{{subst:welcome-ch|$USERNAME$|art=$ARTICLE$}} ~~~~'
				},
				'welcome-uk': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات أوكرانيا',
					syntax: '{{subst:welcome-uk}} ~~~~'
				},
				'welcome-roads': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات الطرق والطرق السريعة',
					syntax: '{{subst:welcome-roads}}'
				},
				'welcome-videogames': {
					description: 'ترحيب للمستخدمين الذين يبدون اهتمامًا بموضوعات ألعاب الفيديو',
					syntax: '{{subst:welcome-videogames}}'
				},
				'WikiProject Women in Red invite': {
					description: 'ترحيب للمستخدمين المهتمين بالكتابة عن النساء',
					syntax: '{{subst:WikiProject Women in Red invite|1=~~~~}}'
				}
			}
		},

		nonEnglish: {
			'قوالب الترحيب غير الإنجليزية': {
				welcomeen: {
					description: 'ترحيب للمستخدمين الذين ليست لغتهم الأولى مدرجة هنا',
					syntax: '{{subst:welcomeen}}'
				},
				'welcomeen-ar': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي العربية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ar}}'
				},
				'welcomeen-sq': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الألبانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-sq}}'
				},
				'welcomeen-zh': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الصينية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-zh}}'
				},
				'welcomeen-nl': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الهولندية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-nl}}'
				},
				'welcomeen-fi': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الفنلندية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-fi}}'
				},
				'welcomeen-fr': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الفرنسية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-fr}}'
				},
				'welcomeen-de': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الألمانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-de}}'
				},
				'welcomeen-ha': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الهوسا',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ha}}'
				},
				'welcomeen-he': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي العبرية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-he}}'
				},
				'welcomeen-hi': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الهندية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-hi}}'
				},
				'welcomeen-id': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الإندونيسية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-id}}'
				},
				'welcomeen-it': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الإيطالية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-it}}'
				},
				'welcomeen-ja': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي اليابانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ja}}'
				},
				'welcomeen-ko': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الكورية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ko}}'
				},
				'welcomeen-ms': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الملايو',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ms}}'
				},
				'welcomeen-ml': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي المالايالامية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ml}}'
				},
				'welcomeen-mr': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي المهاراتية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-mr}}'
				},
				'welcomeen-no': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي النرويجية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-no}}'
				},
				'welcomeen-or': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الأوريا (الأودية)',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-or}}'
				},
				'welcomeen-fa': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الفارسية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-fa}}'
				},
				'welcomeen-pl': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي البولندية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-pl}}'
				},
				'welcomeen-pt': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي البرتغالية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-pt}}'
				},
				'welcomeen-ro': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الرومانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ro}}'
				},
				'welcomeen-ru': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الروسية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ru}}'
				},
				'welcomeen-es': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الإسبانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-es}}'
				},
				'welcomeen-sv': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي السويدية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-sv}}'
				},
				'welcomeen-th': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي التايلاندية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-th}}'
				},
				'welcomeen-tl': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي التغالوغية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-tl}}'
				},
				'welcomeen-tr': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي التركية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-tr}}'
				},
				'welcomeen-uk': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الأوكرانية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-uk}}'
				},
				'welcomeen-ur': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الأردية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-ur}}'
				},
				'welcomeen-vi': {
					description: 'ترحيب للمستخدمين الذين يبدو أن لغتهم الأولى هي الفيتنامية',
					syntax: '== اهلا بك! ==\n{{subst:welcomeen-vi}}'
				}
			}
		}

	};

	Twinkle.welcome.getTemplateWikitext = function (type, template, article) {
		// the iteration is required as the type=standard has two groups
		let properties;
		$.each(Twinkle.welcome.templates[type], (label, templates) => {
			properties = templates[template];
			if (properties) {
				return false; // break
			}
		});
		if (properties) {
			return properties.syntax
				.replace('$USERNAME$', Twinkle.getPref('insertUsername') ? mw.config.get('wgUserName') : '')
				.replace('$ARTICLE$', article || '')
				.replace(/\$HEADER\$\s*/, '== Welcome ==\n\n')
				.replace('$EXTRA$', ''); // EXTRA is not implemented yet
		}
		return '{{subst:' + template + (article ? '|art=' + article : '') + '}}' +
			(Twinkle.getPref('customWelcomeSignature') ? ' ~~~~' : '');
	};

	Twinkle.welcome.callbacks = {
		preview: function (form) {
			const previewDialog = new Morebits.SimpleWindow(750, 400);
			previewDialog.setTitle('معاينة قالب الترحيب');
			previewDialog.setScriptName('الترحيب بالمستخدم');
			previewDialog.setModality(true);

			const previewdiv = document.createElement('div');
			previewdiv.style.marginLeft = previewdiv.style.marginRight = '0.5em';
			previewdiv.style.fontSize = 'small';
			previewDialog.setContent(previewdiv);

			const previewer = new Morebits.wiki.Preview(previewdiv);
			const input = Morebits.QuickForm.getInputData(form);
			previewer.beginRender(Twinkle.welcome.getTemplateWikitext(input.type, input.template, input.article), 'User talk:' + mw.config.get('wgRelevantUserName')); // Force wikitext/correct username

			const submit = document.createElement('input');
			submit.setAttribute('type', 'submit');
			submit.setAttribute('value', 'إغلاق');
			previewDialog.addContent(submit);

			previewDialog.display();

			$(submit).on('click', () => {
				previewDialog.close();
			});
		},
		main: function (pageobj) {
			const params = pageobj.getCallbackParameters();
			let text = pageobj.getPageText();

			// abort if mode is auto and form is not empty
			if (pageobj.exists() && params.mode === 'auto') {
				Morebits.Status.info('تحذير', 'صفحة نقاش المستخدم ليست فارغة؛ يتم إلغاء الترحيب التلقائي');
				Morebits.wiki.actionCompleted.event();
				return;
			}

			const welcomeText = Twinkle.welcome.getTemplateWikitext(params.type, params.template, params.article);

			if (Twinkle.getPref('topWelcomes')) {
				const hasTalkHeader = /^\{\{Talk ?header\}\}/i.test(text);
				if (hasTalkHeader) {
					text = text.replace(/^\{\{Talk ?header\}\}\n{0,2}/i, '');
					text = '{{Talk header}}\n\n' + welcomeText + '\n\n' + text;
					text = text.trim();
				} else {
					text = welcomeText + '\n\n' + text;
				}
			} else {
				text += '\n' + welcomeText;
			}

			const summaryText = 'مرحبا بكم في ويكيبيديا!';
			pageobj.setPageText(text);
			pageobj.setEditSummary(summaryText);
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('watchWelcomes'));
			pageobj.setCreateOption('recreate');
			pageobj.save();
		}
	};

	Twinkle.welcome.callback.evaluate = function twinklewelcomeCallbackEvaluate(e) {
		const form = e.target;

		const params = Morebits.QuickForm.getInputData(form); // : type, template, article
		params.mode = 'manual';

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		const userTalkPage = mw.config.get('wgFormattedNamespaces')[3] + ':' + mw.config.get('wgRelevantUserName');
		Morebits.wiki.actionCompleted.redirect = userTalkPage;
		Morebits.wiki.actionCompleted.notice = 'اكتمل الترحيب، وإعادة تحميل صفحة النقاش في بضع ثوان';

		const wikipedia_page = new Morebits.wiki.Page(userTalkPage, 'تعديل صفحة نقاش المستخدم');
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.welcome.callbacks.main);
	};

	Twinkle.addInitCallback(Twinkle.welcome, 'welcome');
}());

// </nowiki>
