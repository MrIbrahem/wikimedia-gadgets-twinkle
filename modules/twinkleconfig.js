// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkleconfig.js: Preferences module
	 ****************************************
	 * Mode of invocation:     Adds configuration form to Wikipedia:Twinkle/Preferences,
							   and adds an ad box to the top of user subpages belonging to the
							   currently logged-in user which end in '.js'
	 * Active on:              What I just said.  Yeah.
	 */

	Twinkle.config = {};

	Twinkle.config.watchlistEnums = {
		yes: 'أضف إلى قائمة المراقبة (بلا تحديد مدة)',
		no: 'لا تضف إلى قائمة المراقبة',
		default: 'اتبع تفضيلات موقعك',
		'1 week': 'راقب لمدة أسبوع واحد',
		'1 month': 'راقب لمدة شهر واحد',
		'3 months': 'راقب لمدة 3 أشهر',
		'6 months': 'راقب لمدة 6 أشهر'
	};

	Twinkle.config.commonSets = {
		csdCriteria: {
			db: 'Custom rationale ({{db}})',
			g1: "G1", g2: "G2", g3: "G3", g4: "G4", g5: "G5", g6: "G6", g7: "G7", g8: "G8", g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14",
			a1: "A1", a2: "A2", a3: "A3", a7: "A7", a9: "A9", a10: "A10", a11: "A11",
			u1: "U1", u2: "U2", u5: "U5",
			f1: "F1", f2: "F2", f3: "F3", f7: "F7", f8: "F8", f9: "F9",
			c1: "C1", c4: "C4",
			r2: "R2", r3: "R3", r4: "R4"
		},
		csdCriteriaDisplayOrder: [
			"db",
			"g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g10", "g11", "g12", "g13", "g14",
			"a1", "a2", "a3", "a7", "a9", "a10", "a11",
			"u1", "u2", "u5",
			"f1", "f2", "f3", "f7", "f8", "f9",
			"c1", "c4",
			"r2", "r3", "r4"
		],
		csdCriteriaNotification: {
			db: 'Custom rationale ({{db}})',
			g1: "G1", g2: "G2", g3: "G3", g4: "G4", g6: 'G6 ("copy-paste move" only)',
			g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14",
			a1: "A1", a2: "A2", a3: "A3", a7: "A7", a9: "A9", a10: "A10", a11: "A11",
			u5: "U5",
			f1: "F1", f2: "F2", f3: "F3", f7: "F7", f9: "F9",
			c1: "C1",
			r2: "R2", r3: "R3", r4: "R4"
		},
		csdCriteriaNotificationDisplayOrder: [
			"db",
			"g1", "g2", "g3", "g4", "g6", "g10", "g11", "g12", "g13", "g14",
			"a1", "a2", "a3", "a7", "a9", "a10", "a11",
			"u5",
			"f1", "f2", "f3", "f7", "f9",
			"c1",
			"r2", "r3", "r4"
		],
		csdAndImageDeletionCriteria: {
			db: 'Custom rationale ({{db}})',
			g1: "G1", g2: "G2", g3: "G3", g4: "G4", g5: "G5", g6: "G6", g7: "G7", g8: "G8", g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14",
			a1: "A1", a2: "A2", a3: "A3", a7: "A7", a9: "A9", a10: "A10", a11: "A11",
			u1: "U1", u2: "U2", u5: "U5",
			f1: "F1", f2: "F2", f3: "F3", f4: "F4", f5: "F5", f6: "F6", f7: "F7", f8: "F8", f9: "F9", f11: "F11",
			c1: "C1", c4: "C4",
			r2: "R2", r3: "R3", r4: "R4"
		},
		csdAndImageDeletionCriteriaDisplayOrder: [
			"db",
			"g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g10", "g11", "g12", "g13", "g14",
			"a1", "a2", "a3", "a7", "a9", "a10", "a11",
			"u1", "u2", "u5",
			"f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f11",
			"c1", "c4",
			"r2", "r3", "r4"
		],
		namespacesNoSpecial: {
			0: "Article",
			1: 'Talk (article)',
			2: "User",
			3: 'User talk',
			4: "Wikipedia",
			5: 'Wikipedia talk',
			6: "File",
			7: 'File talk',
			8: "MediaWiki",
			9: 'MediaWiki talk',
			10: "Template",
			11: 'Template talk',
			12: "Help",
			13: 'Help talk',
			14: "Category",
			15: 'Category talk',
			100: "Portal",
			101: 'Portal talk',
			118: "Draft",
			119: 'Draft talk',
			710: "TimedText",
			711: 'TimedText talk',
			828: "Module",
			829: 'Module talk'
		}
	};

	/**
	 * Section entry format:
	 *
	 * {
	 *   title: <human-readable section title>,
	 *   module: <name of the associated module, used to link to sections>,
	 *   adminOnly: <true for admin-only sections>,
	 *   hidden: <true for advanced preferences that rarely need to be changed - they can still be modified by manually editing twinkleoptions.js>,
	 *   preferences: [
	 *     {
	 *       name: <TwinkleConfig property name>,
	 *       label: <human-readable short description - used as a form label>,
	 *       helptip: <(optional) human-readable text (using valid HTML) that complements the description, like limits, warnings, etc.>
	 *       adminOnly: <true for admin-only preferences>,
	 *       type: <string|boolean|integer|enum|set|customList> (customList stores an array of JSON objects { value, label }),
	 *       enumValues: <for type = "enum": a JSON object where the keys are the internal names and the values are human-readable strings>,
	 *       setValues: <for type = "set": a JSON object where the keys are the internal names and the values are human-readable strings>,
	 *       setDisplayOrder: <(optional) for type = "set": an array containing the keys of setValues (as strings) in the order that they are displayed>,
	 *       customListValueTitle: <for type = "customList": the heading for the left "value" column in the custom list editor>,
	 *       customListLabelTitle: <for type = "customList": the heading for the right "label" column in the custom list editor>
	 *     },
	 *     . . .
	 *   ]
	 * },
	 * . . .
	 *
	 */

	Twinkle.config.sections = [
		{
			title: 'عام',
			module: "general",
			preferences: [
				// TwinkleConfig.userTalkPageMode may take arguments:
				// "window": open a new window, remember the opened window
				// "tab": opens in a new tab, if possible.
				// "blank": force open in a new window, even if such a window exists
				{
					name: "userTalkPageMode",
					label: 'عند فتح صفحة نقاش مستخدم، افتحها',
					type: "enum",
					enumValues: { window: 'في نافذة، تحل محل صفحات النقاش الأخرى', tab: 'في تبويب جديد', blank: 'في نافذة جديدة تمامًا' }
				},

				// TwinkleConfig.dialogLargeFont (boolean)
				{
					name: "dialogLargeFont",
					label: 'استخدام نص أكبر في حوارات Twinkle',
					type: "boolean"
				},

				// Twinkle.config.disabledModules (array)
				{
					name: "disabledModules",
					label: 'إيقاف تشغيل وحدات Twinkle المحددة',
					helptip: 'أي شيء تختاره هنا لن يكون متاحًا للاستخدام، لذا تصرف بحذر. قم بإلغاء التحديد لإعادة التفعيل.',
					type: "set",
					setValues: { arv: "ARV", warn: 'تحذير', welcome: 'ترحيب', shared: 'عنوان IP مشترك', talkback: 'رد النقاش', speedy: 'حذف سريع', prod: "PROD", xfd: "XfD", image: 'صورة (DI)', protect: 'حماية (RPP)', tag: 'وسم', diff: 'مقارنة التعديلات', unlink: 'إزالة الروابط', rollback: 'استرجاع التعديلات' }
				},

				// Twinkle.config.disabledSysopModules (array)
				{
					name: "disabledSysopModules",
					label: 'إيقاف تشغيل الوحدات الخاصة بالإداريين فقط',
					helptip: 'أي شيء تختاره هنا لن يكون متاحًا للاستخدام، لذا تصرف بحذر. قم بإلغاء التحديد لإعادة التفعيل.',
					adminOnly: true,
					type: "set",
					setValues: { block: 'منع', deprod: 'إلغاء PROD', batchdelete: 'حذف دفعة', batchprotect: 'حماية دفعة', batchundelete: 'استرجاع دفعة' }
				}
			]
		},

		{
			title: "ARV",
			module: "arv",
			preferences: [
				{
					name: "spiWatchReport",
					label: 'إضافة صفحات تقارير الحسابات الوهمية إلى قائمة المراقبة',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				}
			]
		},

		{
			title: 'منع المستخدم',
			module: "block",
			adminOnly: true,
			preferences: [
				// TwinkleConfig.defaultToBlock64 (boolean)
				// Whether to default to just blocking the /64 on or off
				{
					name: "defaultToBlock64",
					label: 'بالنسبة لعناوين IPv6، حدد خيار منع نطاق /64 افتراضيًا',
					type: "boolean"
				},

				// TwinkleConfig.defaultToPartialBlocks (boolean)
				// Whether to default partial blocks on or off
				{
					name: "defaultToPartialBlocks",
					label: 'تحديد المنع الجزئي افتراضيًا عند فتح قائمة المنع',
					helptip: 'إذا كان المستخدم محظورًا بالفعل، فسيتم تجاوز هذا الخيار لصالح نوع المنع الحالي',
					type: "boolean"
				},

				// TwinkleConfig.blankTalkpageOnIndefBlock (boolean)
				// if true, blank the talk page when issuing an indef block notice (per [[WP:UWUL#Indefinitely blocked users]])
				{
					name: "blankTalkpageOnIndefBlock",
					label: 'تفريغ صفحة النقاش عند منع المستخدمين نهائيًا',
					helptip: 'راجع <a href="' + mw.util.getUrl('Wikipedia:WikiProject_User_warnings/Usage_and_layout#Indefinitely_blocked_users') + '">WP:UWUL</a> لمزيد من المعلومات.',
					type: "boolean"
				}
			]
		},

		{
			title: 'حذف الصور (DI)',
			module: "image",
			preferences: [
				// TwinkleConfig.notifyUserOnDeli (boolean)
				// If the user should be notified after placing a file deletion tag
				{
					name: "notifyUserOnDeli",
					label: 'تحديد خيار "إخطار الرافع الأصلي" افتراضيًا',
					type: "boolean"
				},

				// TwinkleConfig.deliWatchPage (string)
				// The watchlist setting of the page tagged for deletion.
				{
					name: "deliWatchPage",
					label: 'إضافة صفحة الصورة إلى قائمة المراقبة عند وضع وسم الحذف',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.deliWatchUser (string)
				// The watchlist setting of the user talk page if a notification is placed.
				{
					name: "deliWatchUser",
					label: 'إضافة صفحة نقاش رافع الصورة الأصلي إلى قائمة المراقبة عند الإخطار',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				}
			]
		},

		{
			title: 'حماية الصفحة ' + (Morebits.userIsSysop ? '(PP)' : '(RPP)'),
			module: "protect",
			preferences: [
				{
					name: "watchRequestedPages",
					label: 'إضافة الصفحة إلى قائمة المراقبة عند طلب الحماية',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "watchPPTaggedPages",
					label: 'إضافة الصفحة إلى قائمة المراقبة عند وسمها بقالب الحماية',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "watchProtectedPages",
					label: 'إضافة الصفحة إلى قائمة المراقبة عند حمايتها',
					helptip: 'إذا تم أيضًا وسم الصفحة بعد الحماية، فسيتم تفضيل هذا الإعداد.',
					adminOnly: true,
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				}
			]
		},

		{
			title: 'الحذف المقترح (PROD)',
			module: "prod",
			preferences: [
				// TwinkleConfig.watchProdPages (string)
				// Watchlist setting when applying prod template to page
				{
					name: "watchProdPages",
					label: 'إضافة المقالة إلى قائمة المراقبة عند وسمها',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.markProdPagesAsPatrolled (boolean)
				// If, when applying prod template to page, to mark the page as curated/patrolled (if the page was reached from NewPages)
				{
					name: "markProdPagesAsPatrolled",
					label: 'وضع علامة "تمت المراجعة" عند وسم الصفحة (إن أمكن)',
					helptip: 'يفضل عدم تفعيل هذا الخيار، حيث إنه يخالف التوافق على أفضل الممارسات',
					type: "boolean"
				},

				// TwinkleConfig.prodReasonDefault (string)
				// The prefilled PROD reason.
				{
					name: "prodReasonDefault",
					label: 'سبب الحذف المقترح الافتراضي',
					type: "string"
				},

				{
					name: "logProdPages",
					label: 'الاحتفاظ بسجل في نطاق المستخدم لجميع الصفحات التي تم وسمها بالحذف المقترح',
					helptip: 'نظرًا لأن غير الإداريين لا يمكنهم الوصول إلى مساهماتهم المحذوفة، يوفر سجل المستخدم طريقة جيدة لتتبع جميع الصفحات التي تم وسمها بالحذف المقترح باستخدام Twinkle.',
					type: "boolean"
				},
				{
					name: "prodLogPageName",
					label: 'الاحتفاظ بسجل الحذف المقترح في صفحة فرعية للمستخدم',
					helptip: 'أدخل اسم الصفحة الفرعية في هذا الحقل. ستجد سجل الحذف المقترح في صفحة المستخدم الخاصة بك على النحو التالي: User:<i>اسم المستخدم</i>/<i>اسم الصفحة الفرعية</i>. يعمل هذا الخيار فقط إذا قمت بتفعيل سجل الحذف المقترح.',
					type: "string"
				}
			]
		},

		{
			title: "التراجع والاسترجاع",
			module: "rollback",
			preferences: [
				// TwinkleConfig.autoMenuAfterRollback (bool)
				// Option to automatically open the warning menu if the user talk page is opened post-reversion
				{
					name: "autoMenuAfterRollback",
					label: "فتح قائمة التحذير في Twinkle تلقائيًا على صفحة نقاش المستخدم بعد التراجع باستخدام Twinkle",
					helptip: "يعمل فقط إذا تم تحديد المربع المناسب أدناه.",
					type: "boolean"
				},
				// TwinkleConfig.openTalkPage (array)
				// What types of actions that should result in opening of talk page
				{
					name: "openTalkPage",
					label: "فتح صفحة نقاش المستخدم بعد هذه الأنواع من التراجعات",
					type: "set",
					setValues: { agf: "تراجع حسن النية", norm: "تراجع عادي", vand: "تراجع عن تخريب" }
				},

				// TwinkleConfig.openTalkPageOnAutoRevert (bool)
				// Defines if talk page should be opened when calling revert from contribs or recent changes pages. If set to true, openTalkPage defines then if talk page will be opened.
				{
					name: "openTalkPageOnAutoRevert",
					label: "فتح صفحة نقاش المستخدم عند التراجع من مساهمات المستخدم أو أحدث التغييرات",
					helptip: "عند تفعيل هذا الخيار، يجب تمكين الخيارات المطلوبة في الإعداد السابق لكي يعمل.",
					type: "boolean"
				},

				// TwinkleConfig.rollbackInPlace (bool)
				//
				{
					name: "rollbackInPlace",
					label: "عدم إعادة تحميل الصفحة عند التراجع من المساهمات أو أحدث التغييرات",
					helptip: "عند تفعيل هذا الخيار، لن يقوم Twinkle بإعادة تحميل المساهمات أو أحدث التغييرات بعد التراجع، مما يسمح لك بالتراجع عن أكثر من تعديل في نفس الوقت.",
					type: "boolean"
				},
				// TwinkleConfig.markRevertedPagesAsMinor (array)
				// What types of actions that should result in marking edit as minor
				{
					name: "markRevertedPagesAsMinor",
					label: "اعتبار التعديلات الطفيفة لهذه الأنواع من التراجعات",
					type: "set",
					setValues: { agf: "تراجع حسن النية", norm: "تراجع عادي", vand: "تراجع عن تخريب", torev: "«استرجاع هذا الإصدار»" }
				},
				// TwinkleConfig.watchRevertedPages (array)
				// What types of actions that should result in forced addition to watchlist
				{
					name: "watchRevertedPages",
					label: "إضافة الصفحات إلى قائمة المراقبة لهذه الأنواع من التراجعات",
					type: "set",
					setValues: { agf: "تراجع حسن النية", norm: "تراجع عادي", vand: "تراجع عن تخريب", torev: "«استرجاع هذا الإصدار»" }
				},
				// TwinkleConfig.watchRevertedExpiry
				// If any of the above items are selected, whether to expire the watch
				{
					name: "watchRevertedExpiry",
					label: "مدة مراقبة الصفحة بعد التراجع عنها",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				// TwinkleConfig.offerReasonOnNormalRevert (boolean)
				// If to offer a prompt for extra summary reason for normal reverts, default to true
				{
					name: "offerReasonOnNormalRevert",
					label: "طلب سبب عند التراجع العادي",
					helptip: "التراجعات «العادية» هي التي يتم تنفيذها من رابط [تراجع] في المنتصف.",
					type: "boolean"
				},
				{
					name: "confirmOnRollback",
					label: "طلب تأكيد قبل التراجع (جميع الأجهزة)",
					helptip: "مفيد لمستخدمي الأجهزة التي تعمل بالقلم أو اللمس، وللأشخاص المترددين دائمًا.",
					type: "boolean"
				},
				{
					name: "confirmOnMobileRollback",
					label: "طلب تأكيد قبل التراجع (الأجهزة المحمولة فقط)",
					helptip: "تجنب التراجعات غير المقصودة عند استخدام الأجهزة المحمولة.",
					type: "boolean"
				},
				// TwinkleConfig.showRollbackLinks (array)
				// Where Twinkle should show rollback links:
				// diff, others, mine, contribs, history, recent
				// Note from TTO: |contribs| seems to be equal to |others| + |mine|, i.e. redundant, so I left it out heres
				{
					name: "showRollbackLinks",
					label: "عرض روابط التراجع في هذه الصفحات",
					type: "set",
					setValues: { diff: "صفحات الفروقات", others: "صفحات مساهمات المستخدمين الآخرين", mine: "صفحة مساهماتي", recent: "صفحات أحدث التغييرات والتغييرات ذات الصلة", history: "صفحات التاريخ" }
				}
			]
		},
		{
			title: "وسم عناوين IP المشتركة",
			module: "shared",
			preferences: [
				{
					name: "markSharedIPAsMinor",
					label: "اعتبار وسم عناوين IP المشتركة تعديلاً طفيفًا",
					type: "boolean"
				}
			]
		},

		{
			title: "الحذف السريع (CSD)",
			module: "speedy",
			preferences: [
				{
					name: "speedySelectionStyle",
					label: "متى يتم وضع الوسم/حذف الصفحة",
					type: "enum",
					enumValues: { buttonClick: "عند النقر على \"إرسال\"", radioClick: "بمجرد اختيار الخيار" }
				},

				// TwinkleConfig.watchSpeedyPages (array)
				// Whether to add speedy tagged or deleted pages to watchlist
				{
					name: "watchSpeedyPages",
					label: "إضافة الصفحة إلى قائمة المراقبة عند استخدام هذه المعايير",
					type: "set",
					setValues: Twinkle.config.commonSets.csdCriteria,
					setDisplayOrder: Twinkle.config.commonSets.csdCriteriaDisplayOrder
				},
				// TwinkleConfig.watchSpeedyExpiry
				// If any of the above items are selected, whether to expire the watch
				{
					name: "watchSpeedyExpiry",
					label: "مدة مراقبة الصفحة عند وضع وسم الحذف",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.markSpeedyPagesAsPatrolled (boolean)
				// If, when applying speedy template to page, to mark the page as triaged/patrolled (if the page was reached from NewPages)
				{
					name: "markSpeedyPagesAsPatrolled",
					label: "وضع علامة مراجعة للصفحة عند وسمها (إن أمكن)",
					helptip: "يُفضَّل عدم تفعيل هذا الخيار لأنه يتعارض مع أفضل الممارسات المتفق عليها.",
					type: "boolean"
				},

				// TwinkleConfig.watchSpeedyUser (string)
				// The watchlist setting of the user talk page if they receive a notification.
				{
					name: "watchSpeedyUser",
					label: "إضافة صفحة نقاش المساهم الأصلي إلى قائمة المراقبة (عند الإخطار)",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.welcomeUserOnSpeedyDeletionNotification (array of strings)
				// On what types of speedy deletion notifications shall the user be welcomed
				// with a "firstarticle" notice if their talk page has not yet been created.
				{
					name: "welcomeUserOnSpeedyDeletionNotification",
					label: "ترحيب بمنشئ الصفحة عند الإخطار بهذه المعايير",
					helptip: "يتم الترحيب فقط إذا تم إخطار المستخدم بالحذف، وفقط إذا لم تكن صفحة نقاشه موجودة. القالب المستخدم هو {{firstarticle}}.",
					type: "set",
					setValues: Twinkle.config.commonSets.csdCriteriaNotification,
					setDisplayOrder: Twinkle.config.commonSets.csdCriteriaNotificationDisplayOrder
				},

				// TwinkleConfig.notifyUserOnSpeedyDeletionNomination (array)
				// What types of actions should result in the author of the page being notified of nomination
				{
					name: "notifyUserOnSpeedyDeletionNomination",
					label: "إخطار منشئ الصفحة عند وسمها بهذه المعايير",
					helptip: "حتى إذا اخترت الإخطار من شاشة CSD، سيتم الإخطار فقط للمعايير المحددة هنا.",
					type: "set",
					setValues: Twinkle.config.commonSets.csdCriteriaNotification,
					setDisplayOrder: Twinkle.config.commonSets.csdCriteriaNotificationDisplayOrder
				},

				// TwinkleConfig.warnUserOnSpeedyDelete (array)
				// What types of actions should result in the author of the page being notified of speedy deletion (admin only)
				{
					name: "warnUserOnSpeedyDelete",
					label: "إخطار منشئ الصفحة عند حذفها وفقًا لهذه المعايير",
					helptip: "حتى إذا اخترت الإخطار من شاشة CSD، سيتم الإخطار فقط للمعايير المحددة هنا.",
					adminOnly: true,
					type: "set",
					setValues: Twinkle.config.commonSets.csdCriteriaNotification,
					setDisplayOrder: Twinkle.config.commonSets.csdCriteriaNotificationDisplayOrder
				},

				// TwinkleConfig.promptForSpeedyDeletionSummary (array of strings)
				{
					name: "promptForSpeedyDeletionSummary",
					label: "السماح بتعديل ملخص الحذف عند الحذف وفقًا لهذه المعايير",
					adminOnly: true,
					type: "set",
					setValues: Twinkle.config.commonSets.csdAndImageDeletionCriteria,
					setDisplayOrder: Twinkle.config.commonSets.csdAndImageDeletionCriteriaDisplayOrder
				},

				// TwinkleConfig.deleteTalkPageOnDelete (boolean)
				// If talk page if exists should also be deleted (CSD G8) when spedying a page (admin only)
				{
					name: "deleteTalkPageOnDelete",
					label: "تحديد مربع \"حذف صفحة النقاش أيضًا\" بشكل افتراضي",
					adminOnly: true,
					type: "boolean"
				},
				{
					name: "deleteRedirectsOnDelete",
					label: "تحديد مربع \"حذف التحويلات أيضًا\" بشكل افتراضي",
					adminOnly: true,
					type: "boolean"
				},

				// TwinkleConfig.deleteSysopDefaultToDelete (boolean)
				// Make the CSD screen default to "delete" instead of "tag" (admin only)
				{
					name: "deleteSysopDefaultToDelete",
					label: "تحديد الحذف المباشر كخيار افتراضي بدلاً من وسم الحذف السريع",
					helptip: "إذا كان هناك وسم CSD موجود مسبقًا، فسيكون وضع \"الحذف\" هو الافتراضي دائمًا.",
					adminOnly: true,
					type: "boolean"
				},

				// TwinkleConfig.speedyWindowWidth (integer)
				// Defines the width of the Twinkle SD window in pixels
				{
					name: "speedyWindowWidth",
					label: "عرض نافذة الحذف السريع (بالبكسل)",
					type: "integer"
				},

				// TwinkleConfig.speedyWindowWidth (integer)
				// Defines the width of the Twinkle SD window in pixels
				{
					name: "speedyWindowHeight",
					label: "ارتفاع نافذة الحذف السريع (بالبكسل)",
					helptip: "إذا كان لديك شاشة كبيرة، قد ترغب في زيادة هذا الرقم.",
					type: "integer"
				},
				{
					name: "logSpeedyNominations",
					label: "الاحتفاظ بسجل في نطاق المستخدم لجميع طلبات الحذف السريع",
					helptip: "نظرًا لأن المستخدمين غير الإداريين لا يمكنهم الوصول إلى مساهماتهم المحذوفة، فإن سجل المستخدم يوفر طريقة جيدة لتتبع جميع الصفحات التي تم ترشيحها للحذف السريع باستخدام Twinkle. يتم أيضًا تسجيل الملفات الموسومة باستخدام DI.",
					type: "boolean"
				},
				{
					name: "speedyLogPageName",
					label: "الاحتفاظ بسجل الحذف السريع في هذه الصفحة الفرعية للمستخدم",
					helptip: "أدخل اسم الصفحة الفرعية في هذا الحقل. ستجد سجل CSD الخاص بك في المستخدم:<i>اسم المستخدم</i>/<i>اسم الصفحة الفرعية</i>. يعمل فقط إذا قمت بتفعيل سجل الحذف السريع في نطاق المستخدم.",
					type: "string"
				},
				{
					name: "noLogOnSpeedyNomination",
					label: "عدم إنشاء سجل في نطاق المستخدم عند وسم الصفحات بهذه المعايير",
					type: "set",
					setValues: Twinkle.config.commonSets.csdAndImageDeletionCriteria,
					setDisplayOrder: Twinkle.config.commonSets.csdAndImageDeletionCriteriaDisplayOrder
				}
			]
		},

		{
			title: "الوسم",
			module: "tag",
			preferences: [
				{
					name: "watchTaggedVenues",
					label: "إضافة الصفحة إلى قائمة المراقبة عند وسم هذه الأنواع من الصفحات",
					type: "set",
					setValues: { articles: "المقالات", drafts: "المسودات", redirects: "التحويلات", files: "الملفات" }
				},
				{
					name: "watchTaggedPages",
					label: "مدة مراقبة الصفحة عند وسمها",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "watchMergeDiscussions",
					label: "إضافة صفحات النقاش إلى قائمة المراقبة عند بدء نقاشات الدمج",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "markTaggedPagesAsMinor",
					label: "اعتبار تعديل إضافة الوسوم تعديلاً طفيفًا",
					type: "boolean"
				},
				{
					name: "markTaggedPagesAsPatrolled",
					label: "تحديد مربع \"وضع علامة مراجعة\" بشكل افتراضي",
					type: "boolean"
				},
				{
					name: "groupByDefault",
					label: "تحديد مربع \"تجميع في {{مشاكل متعددة}}\" بشكل افتراضي",
					type: "boolean"
				},
				{
					name: "tagArticleSortOrder",
					label: "ترتيب عرض وسوم المقالات الافتراضي",
					type: "enum",
					enumValues: { cat: "حسب الفئات", alpha: "حسب الترتيب الأبجدي" }
				},
				{
					name: "customTagList",
					label: "وسوم صيانة المقالات/المسودات المخصصة للعرض",
					helptip: "تظهر هذه الوسوم كخيارات إضافية في أسفل قائمة الوسوم. يمكنك إضافة وسوم صيانة جديدة لم تُدرج بعد ضمن وسوم Twinkle الافتراضية.",
					type: "customList",
					customListValueTitle: "اسم القالب (بدون أقواس معقوفة)",
					customListLabelTitle: "النص المعروض في مربع الوسم"
				},
				{
					name: "customFileTagList",
					label: "وسوم صيانة الملفات المخصصة للعرض",
					helptip: "وسوم إضافية ترغب في إضافتها للملفات.",
					type: "customList",
					customListValueTitle: "اسم القالب (بدون أقواس معقوفة)",
					customListLabelTitle: "النص المعروض في مربع الوسم"
				},
				{
					name: "customRedirectTagList",
					label: "وسوم تصنيف التحويلات المخصصة للعرض",
					helptip: "وسوم إضافية ترغب في إضافتها للتحويلات.",
					type: "customList",
					customListValueTitle: "اسم القالب (بدون أقواس معقوفة)",
					customListLabelTitle: "النص المعروض في مربع الوسم"
				}
			]
		},

		{
			title: "الرد في صفحات النقاش",
			module: "talkback",
			preferences: [
				{
					name: "markTalkbackAsMinor",
					label: "اعتبار الردود في صفحات النقاش تعديلات طفيفة",
					type: "boolean"
				},
				{
					name: "insertTalkbackSignature",
					label: "إدراج التوقيع داخل الردود في صفحات النقاش",
					type: "boolean"
				},
				{
					name: "talkbackHeading",
					label: "عنوان القسم المستخدم في الردود في صفحات النقاش",
					tooltip: "يجب ألّا يتضمن علامات المساواة (\"==\") المستخدمة في تنسيق ويكي",
					type: "string"
				},
				{
					name: "mailHeading",
					label: "عنوان القسم المستخدم لإشعارات \"لديك رسالة\"",
					tooltip: "يجب ألّا يتضمن علامات المساواة (\"==\") المستخدمة في تنسيق ويكي",
					type: "string"
				}
			]
		},
		{
			title: "إلغاء الارتباط",
			module: "unlink",
			preferences: [
				// TwinkleConfig.unlinkNamespaces (array)
				// In what namespaces unlink should happen, default in 0 (article), 10 (template), 100 (portal), and 118 (draft)
				{
					name: "unlinkNamespaces",
					label: "إزالة الروابط من الصفحات في هذه النطاقات",
					helptip: "تجنب تحديد أي نطاقات نقاش، حيث قد يؤدي ذلك إلى إزالة الروابط من الأرشيفات (وهو أمر غير مرغوب فيه).",
					type: "set",
					setValues: Twinkle.config.commonSets.namespacesNoSpecial
				}
			]
		},

		{
			title: "تحذير المستخدم",
			module: "warn",
			preferences: [
				// TwinkleConfig.defaultWarningGroup (int)
				// Which level warning should be the default selected group, default is 1
				{
					name: "defaultWarningGroup",
					label: "مستوى التحذير الافتراضي",
					type: "enum",
					enumValues: {
						1: "المستوى 1",
						2: "المستوى 2",
						3: "المستوى 3",
						4: "المستوى 4",
						5: "المستوى 4im",
						6: "إشعارات القضايا الفردية",
						7: "تحذيرات القضايا الفردية",
						9: "تحذيرات مخصصة",
						10: "جميع قوالب التحذير",
						11: "تحديد المستوى تلقائيًا (1-4)"
					}
				},
				// TwinkleConfig.combinedSingletMenus (boolean)
				// if true, show one menu with both single-issue notices and warnings instead of two separately
				{
					name: "combinedSingletMenus",
					label: "دمج قوائم الإشعارات والتحذيرات الفردية في قائمة واحدة",
					helptip: "إذا اخترت الإشعارات أو التحذيرات الفردية كمستوى افتراضي، فسيتم تعيين هذا الخيار افتراضيًا عند التمكين.",
					type: "boolean"
				},
				// TwinkleConfig.showSharedIPNotice may take arguments:
				// true: to show shared ip notice if an IP address
				// false: to not print the notice
				{
					name: "showSharedIPNotice",
					label: "إضافة إشعار إضافي في صفحات نقاش عناوين IP المشتركة",
					helptip: "يتم استخدام القالب {{نصائح عنوان IP مشترك}}.",
					type: "boolean"
				},
				// TwinkleConfig.watchWarnings (string)
				// Watchlist setting for the page which has been dispatched an warning or notice
				{
					name: "watchWarnings",
					label: "إضافة صفحة نقاش المستخدم إلى قائمة المراقبة عند إرسال تحذير",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.oldSelect (boolean)
				// if true, use the native select menu rather the select2-based one
				{
					name: "oldSelect",
					label: "استخدام القائمة الكلاسيكية غير القابلة للبحث",
					type: "boolean"
				},
				{
					name: "customWarningList",
					label: "قوالب تحذير مخصصة للعرض",
					helptip: "يمكنك إضافة قوالب فردية أو صفحات فرعية للمستخدم. ستظهر التحذيرات المخصصة في فئة \"تحذيرات مخصصة\" داخل مربع الحوار.",
					type: "customList",
					customListValueTitle: "اسم القالب (بدون أقواس معقوفة)",
					customListLabelTitle: "النص المعروض في قائمة التحذيرات (يُستخدم أيضًا كملخص تعديل)"
				}
			]
		},

		{
			title: 'مرحبًا بالمستخدم',
			module: "welcome",
			preferences: [
				{
					name: "topWelcomes",
					label: 'وضع الترحيبات أعلى المحتوى الموجود في صفحات نقاش المستخدمين',
					type: "boolean"
				},
				{
					name: "watchWelcomes",
					label: 'إضافة صفحات نقاش المستخدمين إلى قائمة المراقبة عند الترحيب',
					helptip: 'يضيف ذلك عنصرًا شخصيًا إلى الترحيب بالمستخدم - ستتمكن من رؤية كيفية تأقلمهم كمبتدئين، وربما مساعدتهم.',
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "insertUsername",
					label: 'إضافة اسم المستخدم الخاص بك إلى القالب (عند الاقتضاء)',
					helptip: 'تحتوي بعض قوالب الترحيب على جملة افتتاحية مثل "مرحبًا، أنا &lt;username&gt;. أهلًا وسهلًا" وما إلى ذلك. إذا أوقفت هذا الخيار، فلن تعرض هذه القوالب اسم المستخدم بهذه الطريقة.',
					type: "boolean"
				},
				{
					name: "quickWelcomeMode",
					label: 'النقر على رابط "الترحيب" في صفحة الفرق (والذي يظهر فقط إذا لم يتم إنشاء صفحة نقاش المستخدم بعد) سيؤدي إلى',
					helptip: 'إذا اخترت الترحيب تلقائيًا، فسيتم استخدام القالب الذي تحدده أدناه.',
					type: "enum",
					enumValues: { auto: 'نشر قالب الترحيب المحدد أدناه فورًا', norm: 'مطالبتك باختيار قالب' }
				},
				{
					name: "quickWelcomeTemplate",
					label: 'القالب المستخدم عند الترحيب تلقائيًا',
					helptip: 'أدخل اسم قالب الترحيب بدون الأقواس المعقوفة. سيتم إضافة رابط إلى المقالة المحددة.',
					type: "string"
				},
				{
					name: "customWelcomeList",
					label: 'قوالب الترحيب المخصصة لعرضها',
					helptip: 'يمكنك إضافة قوالب ترحيب أخرى، أو صفحات فرعية للمستخدم تحتوي على قوالب ترحيب (مسبوقة بـ "User:"). لا تنسَ أن هذه القوالب يتم استبدالها على صفحات نقاش المستخدمين.',
					type: "customList",
					customListValueTitle: 'اسم القالب (بدون أقواس معقوفة)',
					customListLabelTitle: 'النص المعروض في مربع حوار الترحيب'
				},
				{
					name: "customWelcomeSignature",
					label: 'التوقيع تلقائيًا على قوالب الترحيب المخصصة',
					helptip: 'إذا كانت قوالب الترحيب المخصصة تحتوي على توقيع مدمج داخل القالب، قم بإيقاف هذا الخيار.',
					type: "boolean"
				}
			]
		},

		{
			title: "XFD (مناقشات الحذف)",
			module: "xfd",
			preferences: [
				{
					name: "logXfdNominations",
					label: "الاحتفاظ بسجل في نطاق المستخدم لجميع الصفحات التي ترشحها لمناقشة الحذف (XfD)",
					helptip: "يوفر سجل نطاق المستخدم طريقة جيدة لتتبع جميع الصفحات التي ترشحها لـ XfD باستخدام Twinkle.",
					type: "boolean"
				},
				{
					name: "xfdLogPageName",
					label: "الاحتفاظ بسجل مناقشة الحذف في هذه الصفحة الفرعية للمستخدم",
					helptip: "أدخل اسم الصفحة الفرعية في هذا المربع. ستجد سجل XfD الخاص بك في User:<i>اسم المستخدم</i>/<i>اسم الصفحة الفرعية</i>. يعمل فقط إذا قمت بتفعيل سجل XfD في نطاق المستخدم.",
					type: "string"
				},
				{
					name: "noLogOnXfdNomination",
					label: "عدم إنشاء إدخال في سجل نطاق المستخدم عند الترشيح في هذا المكان",
					type: "set",
					setValues: { afd: "AfD", tfd: "TfD", ffd: "FfD", cfd: "CfD", cfds: "CfD/S", mfd: "MfD", rfd: "RfD", rm: "RM" }
				},

				// TwinkleConfig.xfdWatchPage (string)
				// The watchlist setting of the page being nominated for XfD.
				{
					name: "xfdWatchPage",
					label: "إضافة الصفحة المرشحة إلى قائمة المراقبة",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.xfdWatchDiscussion (string)
				// The watchlist setting of the newly created XfD page (for those processes that create discussion pages for each nomination),
				// or the list page for the other processes.
				{
					name: "xfdWatchDiscussion",
					label: "إضافة صفحة مناقشة الحذف إلى قائمة المراقبة",
					helptip: "يشير هذا إلى الصفحة الفرعية للمناقشة (لـ AfD وMfD) أو صفحة السجل اليومي (لـ TfD وCfD وRfD وFfD).",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.xfdWatchList (string)
				// The watchlist setting of the XfD list page, *if* the discussion is on a separate page.
				{
					name: "xfdWatchList",
					label: "إضافة صفحة السجل/القائمة اليومية إلى قائمة المراقبة (AfD وMfD)",
					helptip: "ينطبق هذا فقط على AfD وMfD، حيث يتم تضمين المناقشات في صفحة سجل يومي (لـ AfD) أو الصفحة الرئيسية لـ MfD.",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.xfdWatchUser (string)
				// The watchlist setting of the user talk page if they receive a notification.
				{
					name: "xfdWatchUser",
					label: "إضافة صفحة نقاش المستخدم للمساهم الأول إلى قائمة المراقبة (عند الإخطار)",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},

				// TwinkleConfig.xfdWatchRelated (string)
				// The watchlist setting of the target of a redirect being nominated for RfD.
				{
					name: "xfdWatchRelated",
					label: "إضافة صفحة الهدف لعملية إعادة التوجيه إلى قائمة المراقبة (عند الإخطار)",
					helptip: "ينطبق هذا فقط على RfD، عند ترك إشعار على صفحة نقاش الهدف لعملية إعادة التوجيه.",
					type: "enum",
					enumValues: Twinkle.config.watchlistEnums
				},
				{
					name: "markXfdPagesAsPatrolled",
					label: "وضع علامة على الصفحة كمراجعة/دورية عند ترشيحها لـ AFD (إن أمكن)",
					type: "boolean"
				}
			]
		},

		{
			title: "Hidden",
			hidden: true,
			preferences: [
				// twinklerollback.js: defines how many revision to query maximum, maximum possible is 50, default is 50
				{
					name: "revertMaxRevisions",
					type: "integer"
				},
				// twinklewarn.js: When using the autolevel select option, how many days makes a prior warning stale
				// Huggle is three days ([[Special:Diff/918980316]] and [[Special:Diff/919417999]]) while ClueBotNG is two:
				// https://github.com/DamianZaremba/cluebotng/blob/4958e25d6874cba01c75f11debd2e511fd5a2ce5/bot/action_functions.php#L62
				{
					name: "autolevelStaleDays",
					type: "integer"
				},
				// How many pages should be queried by deprod and batchdelete/protect/undelete
				{
					name: "batchMax",
					type: "integer",
					adminOnly: true
				},
				// How many pages should be processed at a time by deprod and batchdelete/protect/undelete
				{
					name: "batchChunks",
					type: "integer",
					adminOnly: true
				}
			]
		}

	]; // end of Twinkle.config.sections

	Twinkle.config.init = function twinkleconfigInit() {

		// create the config page at Wikipedia:Twinkle/Preferences
		if ((mw.config.get("wgNamespaceNumber") === mw.config.get("wgNamespaceIds").project && mw.config.get("wgTitle") === 'Twinkle/Preferences') &&
			mw.config.get("wgAction") === "view") {

			if (!document.getElementById('twinkle-config')) {
				return; // maybe the page is misconfigured, or something - but any attempt to modify it will be pointless
			}

			// set style to nothing to prevent conflict with external css
			document.getElementById('twinkle-config').removeAttribute("style");
			document.getElementById('twinkle-config-titlebar').removeAttribute("style");

			const contentdiv = document.getElementById('twinkle-config-content');
			contentdiv.textContent = ''; // clear children

			// let user know about possible conflict with skin js/common.js file
			// (settings in that file will still work, but they will be overwritten by twinkleoptions.js settings)
			if (window.TwinkleConfig || window.FriendlyConfig) {
				const contentnotice = document.createElement("p");
				contentnotice.innerHTML = '<table class="plainlinks morebits-ombox morebits-ombox-content"><tr><td class="morebits-mbox-image">' +
					'<img alt="" src="https://upload.wikimedia.org/wikipedia/commons/3/38/Imbox_content.png" /></td>' +
					'<td class="morebits-mbox-text"><p><big><b>قبل تعديل إعداداتك هنا،</b> يجب عليك إزالة إعدادات Twinkle و Friendly القديمة من ملف JavaScript الخاص بواجهتك.</big></p>' +
					'<p>للقيام بذلك، يمكنك <a href="' + mw.util.getUrl('User:' + mw.config.get("wgUserName") + '/' + mw.config.get("skin") +
						'.js', { action: "edit" }) + '" target="_blank"><b>تعديل ملف JavaScript الخاص بواجهتك</b></a> أو <a href="' +
					mw.util.getUrl('User:' + mw.config.get("wgUserName") + '/common.js', { action: "edit" }) + '" target="_blank"><b>ملف common.js الخاص بك</b></a>، وإزالة جميع سطور التعليمات البرمجية التي تشير إلى <code>TwinkleConfig</code> و <code>FriendlyConfig</code>.</p>' +
					'</td></tr></table>';
				contentdiv.appendChild(contentnotice);
			}

			// start a table of contents
			const toctable = document.createElement("div");
			toctable.className = "toc";
			toctable.style.marginLeft = '0.4em';
			// create TOC title
			const toctitle = document.createElement("div");
			toctitle.id = "toctitle";
			const toch2 = document.createElement("h2");
			toch2.textContent = 'المحتويات ';
			toctitle.appendChild(toch2);
			// add TOC show/hide link
			const toctoggle = document.createElement("span");
			toctoggle.className = "toctoggle";
			toctoggle.appendChild(document.createTextNode('['));
			const toctogglelink = document.createElement("a");
			toctogglelink.className = "internal";
			toctogglelink.setAttribute("href", '#tw-tocshowhide');
			toctogglelink.textContent = 'إخفاء';
			toctoggle.appendChild(toctogglelink);
			toctoggle.appendChild(document.createTextNode(']'));
			toctitle.appendChild(toctoggle);
			toctable.appendChild(toctitle);
			// create item container: this is what we add stuff to
			const tocul = document.createElement("ul");
			toctogglelink.addEventListener("click", () => {
				const $tocul = $(tocul);
				$tocul.toggle();
				if ($tocul.find(':visible').length) {
					toctogglelink.textContent = 'إخفاء';
				} else {
					toctogglelink.textContent = 'إظهار';
				}
			}, false);
			toctable.appendChild(tocul);
			contentdiv.appendChild(toctable);

			const contentform = document.createElement("form");
			contentform.setAttribute("action", 'javascript:void(0)'); // was #tw-save - changed to void(0) to work around Chrome issue
			contentform.addEventListener("submit", Twinkle.config.save, true);
			contentdiv.appendChild(contentform);

			const container = document.createElement("table");
			container.style.width = '100%';
			contentform.appendChild(container);

			$(Twinkle.config.sections).each((sectionkey, section) => {
				if (section.hidden || (section.adminOnly && !Morebits.userIsSysop)) {
					return true; // i.e. "continue" in this context
				}

				// add to TOC
				const tocli = document.createElement("li");
				tocli.className = 'toclevel-1';
				const toca = document.createElement("a");
				toca.setAttribute("href", '#' + section.module);
				toca.appendChild(document.createTextNode(section.title));
				tocli.appendChild(toca);
				tocul.appendChild(tocli);

				let row = document.createElement("tr");
				let cell = document.createElement("td");
				cell.setAttribute("colspan", "3");
				const heading = document.createElement("h4");
				heading.style.borderBottom = '1px solid gray';
				heading.style.marginTop = '0.2em';
				heading.id = section.module;
				heading.appendChild(document.createTextNode(section.title));
				cell.appendChild(heading);
				row.appendChild(cell);
				container.appendChild(row);

				let rowcount = 1; // for row banding

				// add each of the preferences to the form
				$(section.preferences).each((prefkey, pref) => {
					if (pref.adminOnly && !Morebits.userIsSysop) {
						return true; // i.e. "continue" in this context
					}

					row = document.createElement("tr");
					row.style.marginBottom = '0.2em';
					// create odd row banding
					if (rowcount++ % 2 === 0) {
						row.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
					}
					cell = document.createElement("td");

					let label, input;
					const gotPref = Twinkle.getPref(pref.name);
					switch (pref.type) {

						case "boolean": // create a checkbox
							cell.setAttribute("colspan", "2");

							label = document.createElement("label");
							input = document.createElement("input");
							input.setAttribute("type", "checkbox");
							input.setAttribute("id", pref.name);
							input.setAttribute("name", pref.name);
							if (gotPref === true) {
								input.setAttribute("checked", "checked");
							}
							label.appendChild(input);
							label.appendChild(document.createTextNode(pref.label));
							cell.appendChild(label);
							break;

						case "string": // create an input box
						case "integer":
							// add label to first column
							cell.style.textAlign = "right";
							cell.style.paddingRight = '0.5em';
							label = document.createElement("label");
							label.setAttribute("for", pref.name);
							label.appendChild(document.createTextNode(pref.label + ':'));
							cell.appendChild(label);
							row.appendChild(cell);

							// add input box to second column
							cell = document.createElement("td");
							cell.style.paddingRight = "1em";
							input = document.createElement("input");
							input.setAttribute("type", "text");
							input.setAttribute("id", pref.name);
							input.setAttribute("name", pref.name);
							if (pref.type === "integer") {
								input.setAttribute("size", 6);
								input.setAttribute("type", "number");
								input.setAttribute("step", "1"); // integers only
							}
							if (gotPref) {
								input.setAttribute("value", gotPref);
							}
							cell.appendChild(input);
							break;

						case "enum": // create a combo box
							// add label to first column
							// note: duplicates the code above, under string/integer
							cell.style.textAlign = "right";
							cell.style.paddingRight = '0.5em';
							label = document.createElement("label");
							label.setAttribute("for", pref.name);
							label.appendChild(document.createTextNode(pref.label + ':'));
							cell.appendChild(label);
							row.appendChild(cell);

							// add input box to second column
							cell = document.createElement("td");
							cell.style.paddingRight = "1em";
							input = document.createElement("select");
							input.setAttribute("id", pref.name);
							input.setAttribute("name", pref.name);
							$.each(pref.enumValues, (enumvalue, enumdisplay) => {
								const option = document.createElement("option");
								option.setAttribute("value", enumvalue);
								if ((gotPref === enumvalue) ||
									// Hack to convert old boolean watchlist prefs
									// to corresponding enums (added in v2.1)
									(typeof gotPref === "boolean" &&
										((gotPref && enumvalue === "yes") ||
											(!gotPref && enumvalue === "no")))) {
									option.setAttribute("selected", "selected");
								}
								option.appendChild(document.createTextNode(enumdisplay));
								input.appendChild(option);
							});
							cell.appendChild(input);
							break;

						case "set": // create a set of check boxes
							// add label first of all
							cell.setAttribute("colspan", "2");
							label = document.createElement("label"); // not really necessary to use a label element here, but we do it for consistency of styling
							label.appendChild(document.createTextNode(pref.label + ':'));
							cell.appendChild(label);

							var checkdiv = document.createElement("div");
							checkdiv.style.paddingLeft = "1em";
							var worker = function (itemkey, itemvalue) {
								const checklabel = document.createElement("label");
								checklabel.style.marginRight = '0.7em';
								checklabel.style.display = 'inline-block';
								const check = document.createElement("input");
								check.setAttribute("type", "checkbox");
								check.setAttribute("id", pref.name + "_" + itemkey);
								check.setAttribute("name", pref.name + "_" + itemkey);
								if (gotPref && gotPref.includes(itemkey)) {
									check.setAttribute("checked", "checked");
								}
								// cater for legacy integer array values for unlinkNamespaces (this can be removed a few years down the track...)
								if (pref.name === "unlinkNamespaces") {
									if (gotPref && gotPref.includes(parseInt(itemkey, 10))) {
										check.setAttribute("checked", "checked");
									}
								}
								checklabel.appendChild(check);
								checklabel.appendChild(document.createTextNode(itemvalue));
								checkdiv.appendChild(checklabel);
							};
							if (pref.setDisplayOrder) {
								// add check boxes according to the given display order
								$.each(pref.setDisplayOrder, (itemkey, item) => {
									worker(item, pref.setValues[item]);
								});
							} else {
								// add check boxes according to the order it gets fed to us (probably strict alphabetical)
								$.each(pref.setValues, worker);
							}
							cell.appendChild(checkdiv);
							break;

						case "customList":
							// add label to first column
							cell.style.textAlign = "right";
							cell.style.paddingRight = '0.5em';
							label = document.createElement("label");
							label.setAttribute("for", pref.name);
							label.appendChild(document.createTextNode(pref.label + ':'));
							cell.appendChild(label);
							row.appendChild(cell);

							// add button to second column
							cell = document.createElement("td");
							cell.style.paddingRight = "1em";
							var button = document.createElement("button");
							button.setAttribute("id", pref.name);
							button.setAttribute("name", pref.name);
							button.setAttribute("type", "button");
							button.addEventListener("click", Twinkle.config.listDialog.display, false);
							// use jQuery data on the button to store the current config value
							$(button).data({
								value: gotPref,
								pref: pref
							});
							button.appendChild(document.createTextNode('تعديل العناصر'));
							cell.appendChild(button);
							break;

						default:
							alert('twinkleconfig: نوع بيانات غير معروف للتفضيل ' + pref.name);
							break;
					}
					row.appendChild(cell);

					// add help tip
					cell = document.createElement("td");
					cell.className = 'twinkle-config-helptip';

					if (pref.helptip) {
						// convert mentions of templates in the helptip to clickable links
						cell.innerHTML = pref.helptip.replace(/{{(.+?)}}/g,
							'{{<a href="' + mw.util.getUrl('Template:') + '$1" target="_blank">$1</a>}}');
					}
					// add reset link (custom lists don't need this, as their config value isn't displayed on the form)
					if (pref.type !== "customList") {
						const resetlink = document.createElement("a");
						resetlink.setAttribute("href", '#tw-reset');
						resetlink.setAttribute("id", 'twinkle-config-reset-' + pref.name);
						resetlink.addEventListener("click", Twinkle.config.resetPrefLink, false);
						resetlink.style.cssFloat = "right";
						resetlink.style.margin = '0 0.6em';
						resetlink.appendChild(document.createTextNode('إعادة تعيين'));
						cell.appendChild(resetlink);
					}
					row.appendChild(cell);

					container.appendChild(row);
					return true;
				});
				return true;
			});

			const footerbox = document.createElement("div");
			footerbox.setAttribute("id", 'twinkle-config-buttonpane');
			const button = document.createElement("button");
			button.setAttribute("id", 'twinkle-config-submit');
			button.setAttribute("type", "submit");
			button.appendChild(document.createTextNode('حفظ التغييرات'));
			footerbox.appendChild(button);
			const footerspan = document.createElement("span");
			footerspan.className = "plainlinks";
			footerspan.style.marginLeft = '2.4em';
			footerspan.style.fontSize = '90%';
			const footera = document.createElement("a");
			footera.setAttribute("href", '#tw-reset-all');
			footera.setAttribute("id", 'twinkle-config-resetall');
			footera.addEventListener("click", Twinkle.config.resetAllPrefs, false);
			footera.appendChild(document.createTextNode('استعادة الافتراضيات'));
			footerspan.appendChild(footera);
			footerbox.appendChild(footerspan);
			contentform.appendChild(footerbox);

			// since all the section headers exist now, we can try going to the requested anchor
			if (window.location.hash) {
				const loc = window.location.hash;
				window.location.hash = '';
				window.location.hash = loc;
			}

		} else if (mw.config.get("wgNamespaceNumber") === mw.config.get("wgNamespaceIds").user &&
			mw.config.get("wgTitle").indexOf(mw.config.get("wgUserName")) === 0 &&
			mw.config.get("wgPageName").slice(-3) === '.js') {

			const box = document.createElement("div");
			// Styled in twinkle.css
			box.setAttribute("id", 'twinkle-config-headerbox');

			let link;
			const scriptPageName = mw.config.get("wgPageName").slice(
				mw.config.get("wgPageName").lastIndexOf('/') + 1,
				mw.config.get("wgPageName").lastIndexOf('.js')
			);

			if (scriptPageName === "twinkleoptions") {
				// place "why not try the preference panel" notice
				box.setAttribute("class", 'config-twopt-box');

				if (mw.config.get("wgArticleId") > 0) { // page exists
					box.appendChild(document.createTextNode('تحتوي هذه الصفحة على تفضيلات Twinkle الخاصة بك. يمكنك تغييرها باستخدام '));
				} else { // page does not exist
					box.appendChild(document.createTextNode('يمكنك تخصيص Twinkle ليناسب تفضيلاتك باستخدام '));
				}
				link = document.createElement("a");
				link.setAttribute("href", mw.util.getUrl(mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").project] + ':Twinkle/Preferences'));
				link.appendChild(document.createTextNode('لوحة تفضيلات Twinkle'));
				box.appendChild(link);
				box.appendChild(document.createTextNode('، أو عن طريق تعديل هذه الصفحة.'));
				$(box).insertAfter($('#contentSub'));

			} else if (["monobook", "vector", 'vector-2022', "cologneblue", "modern", "timeless", "minerva", "common"].includes(scriptPageName)) {
				// place "Looking for Twinkle options?" notice
				box.setAttribute("class", 'config-userskin-box');

				box.appendChild(document.createTextNode('إذا كنت ترغب في تعيين تفضيلات Twinkle، يمكنك استخدام '));
				link = document.createElement("a");
				link.setAttribute("href", mw.util.getUrl(mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").project] + ':Twinkle/Preferences'));
				link.appendChild(document.createTextNode('لوحة تفضيلات Twinkle'));
				box.appendChild(link);
				box.appendChild(document.createTextNode('.'));
				$(box).insertAfter($('#contentSub'));
			}
		}
	};

	// custom list-related stuff

	Twinkle.config.listDialog = {};

	Twinkle.config.listDialog.addRow = function twinkleconfigListDialogAddRow($dlgtable, value, label) {
		let $contenttr, $valueInput, $labelInput;

		$dlgtable.append(
			$contenttr = $('<tr>').append(
				$('<td>').append(
					$('<button>')
						.attr("type", "button")
						.on("click", () => {
							$contenttr.remove();
						})
						.text("Remove")
				),
				$('<td>').append(
					$valueInput = $('<input>')
						.attr("type", "text")
						.addClass('twinkle-config-customlist-value')
						.css("width", '97%')
				),
				$('<td>').append(
					$labelInput = $('<input>')
						.attr("type", "text")
						.addClass('twinkle-config-customlist-label')
						.css("width", '98%')
				)
			)
		);

		if (value) {
			$valueInput.val(value);
		}
		if (label) {
			$labelInput.val(label);
		}

	};

	Twinkle.config.listDialog.display = function twinkleconfigListDialogDisplay(e) {
		const $prefbutton = $(e.target);
		const curvalue = $prefbutton.data("value");
		const curpref = $prefbutton.data("pref");

		const dialog = new Morebits.SimpleWindow(720, 400);
		dialog.setTitle(curpref.label);
		dialog.setScriptName('Twinkle preferences');

		let $dlgtbody;

		dialog.setContent(
			$('<div>').append(
				$('<table>')
					.addClass("wikitable")
					.css({
						margin: '1.4em 1em',
						width: "auto"
					})
					.append(
						$dlgtbody = $('<tbody>').append(
							// header row
							$('<tr>').append(
								$('<th>') // top-left cell
									.css("width", '5%'),
								$('<th>') // value column header
									.css("width", '35%')
									.text(curpref.customListValueTitle ? curpref.customListValueTitle : "Value"),
								$('<th>') // label column header
									.css("width", '60%')
									.text(curpref.customListLabelTitle ? curpref.customListLabelTitle : "Label")
							)
						),
						$('<tfoot>').append(
							$('<tr>').append(
								$('<td>')
									.attr("colspan", "3")
									.append(
										$('<button>')
											.text("Add")
											.css('min-width', "8em")
											.attr("type", "button")
											.on("click", () => {
												Twinkle.config.listDialog.addRow($dlgtbody);
											})
									)
							)
						)
					),
				$('<button>')
					.text('Save changes')
					.attr("type", "submit") // so Morebits.SimpleWindow puts the button in the button pane
					.on("click", () => {
						Twinkle.config.listDialog.save($prefbutton, $dlgtbody);
						dialog.close();
					}),
				$('<button>')
					.text("Reset")
					.attr("type", "submit")
					.on("click", () => {
						Twinkle.config.listDialog.reset($prefbutton, $dlgtbody);
					}),
				$('<button>')
					.text("Cancel")
					.attr("type", "submit")
					.on("click", () => {
						dialog.close();
					})
			)[0]
		);

		// content rows
		let gotRow = false;
		$.each(curvalue, (k, v) => {
			gotRow = true;
			Twinkle.config.listDialog.addRow($dlgtbody, v.value, v.label);
		});
		// if there are no values present, add a blank row to start the user off
		if (!gotRow) {
			Twinkle.config.listDialog.addRow($dlgtbody);
		}

		dialog.display();
	};

	// Resets the data value, re-populates based on the new (default) value, then saves the
	// old data value again (less surprising behaviour)
	Twinkle.config.listDialog.reset = function twinkleconfigListDialogReset($button, $tbody) {
		// reset value on button
		const curpref = $button.data("pref");
		const oldvalue = $button.data("value");
		Twinkle.config.resetPref(curpref);

		// reset form
		$tbody.find("tr").slice(1).remove(); // all rows except the first (header) row
		// add the new values
		const curvalue = $button.data("value");
		$.each(curvalue, (k, v) => {
			Twinkle.config.listDialog.addRow($tbody, v.value, v.label);
		});

		// save the old value
		$button.data("value", oldvalue);
	};

	Twinkle.config.listDialog.save = function twinkleconfigListDialogSave($button, $tbody) {
		const result = [];
		let current = {};
		$tbody.find('input[type="text"]').each((inputkey, input) => {
			if ($(input).hasClass('twinkle-config-customlist-value')) {
				current = { value: input.value };
			} else {
				current.label = input.value;
				// exclude totally empty rows
				if (current.value || current.label) {
					result.push(current);
				}
			}
		});
		$button.data("value", result);
	};

	// reset/restore defaults

	Twinkle.config.resetPrefLink = function twinkleconfigResetPrefLink(e) {
		const wantedpref = e.target.id.slice(21); // "twinkle-config-reset-" prefix is stripped

		// search tactics
		$(Twinkle.config.sections).each((sectionkey, section) => {
			if (section.hidden || (section.adminOnly && !Morebits.userIsSysop)) {
				return true; // continue: skip impossibilities
			}

			let foundit = false;

			$(section.preferences).each((prefkey, pref) => {
				if (pref.name !== wantedpref) {
					return true; // continue
				}
				Twinkle.config.resetPref(pref);
				foundit = true;
				return false; // break
			});

			if (foundit) {
				return false; // break
			}
		});
		return false; // stop link from scrolling page
	};

	Twinkle.config.resetPref = function twinkleconfigResetPref(pref) {
		switch (pref.type) {

			case "boolean":
				document.getElementById(pref.name).checked = Twinkle.defaultConfig[pref.name];
				break;

			case "string":
			case "integer":
			case "enum":
				document.getElementById(pref.name).value = Twinkle.defaultConfig[pref.name];
				break;

			case "set":
				$.each(pref.setValues, (itemkey) => {
					if (document.getElementById(pref.name + "_" + itemkey)) {
						document.getElementById(pref.name + "_" + itemkey).checked = Twinkle.defaultConfig[pref.name].includes(itemkey);
					}
				});
				break;

			case "customList":
				$(document.getElementById(pref.name)).data("value", Twinkle.defaultConfig[pref.name]);
				break;

			default:
				alert('تكوين twinkle: نوع بيانات غير معروف للتفضيل ' + pref.name);
				break;
		}
	};

	Twinkle.config.resetAllPrefs = function twinkleconfigResetAllPrefs() {
		// no confirmation message - the user can just refresh/close the page to abort
		$(Twinkle.config.sections).each((sectionkey, section) => {
			if (section.hidden || (section.adminOnly && !Morebits.userIsSysop)) {
				return true; // continue: skip impossibilities
			}
			$(section.preferences).each((prefkey, pref) => {
				if (!pref.adminOnly || Morebits.userIsSysop) {
					Twinkle.config.resetPref(pref);
				}
			});
			return true;
		});
		return false; // stop link from scrolling page
	};

	Twinkle.config.save = function twinkleconfigSave(e) {
		Morebits.Status.init(document.getElementById('twinkle-config-content'));

		const userjs = mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").user] + ':' + mw.config.get("wgUserName") + '/twinkleoptions.js';
		const wikipedia_page = new Morebits.wiki.Page(userjs, 'حفظ التفضيلات في ' + userjs);
		wikipedia_page.setCallbackParameters(e.target);
		wikipedia_page.load(Twinkle.config.writePrefs);

		return false;
	};

	Twinkle.config.writePrefs = function twinkleconfigWritePrefs(pageobj) {
		const form = pageobj.getCallbackParameters();

		// this is the object which gets serialized into JSON; only
		// preferences that this script knows about are kept
		const newConfig = { optionsVersion: 2.1 };

		// a comparison function is needed later on
		// it is just enough for our purposes (i.e. comparing strings, numbers, booleans,
		// arrays of strings, and arrays of { value, label })
		// and it is not very robust: e.g. compare([2], ["2"]) === true, and
		// compare({}, {}) === false, but it's good enough for our purposes here
		const compare = function (a, b) {
			if (Array.isArray(a)) {
				if (a.length !== b.length) {
					return false;
				}
				const asort = a.sort(), bsort = b.sort();
				for (let i = 0; asort[i]; ++i) {
					// comparison of the two properties of custom lists
					if ((typeof asort[i] === "object") && (asort[i].label !== bsort[i].label ||
						asort[i].value !== bsort[i].value)) {
						return false;
					} else if (asort[i].toString() !== bsort[i].toString()) {
						return false;
					}
				}
				return true;
			}
			return a === b;

		};

		$(Twinkle.config.sections).each((sectionkey, section) => {
			if (section.adminOnly && !Morebits.userIsSysop) {
				return; // i.e. "continue" in this context
			}

			// reach each of the preferences from the form
			$(section.preferences).each((prefkey, pref) => {
				let userValue; // = undefined

				// only read form values for those prefs that have them
				if (!pref.adminOnly || Morebits.userIsSysop) {
					if (!section.hidden) {
						switch (pref.type) {
							case "boolean": // read from the checkbox
								userValue = form[pref.name].checked;
								break;

							case "string": // read from the input box or combo box
							case "enum":
								userValue = form[pref.name].value;
								break;

							case "integer": // read from the input box
								userValue = parseInt(form[pref.name].value, 10);
								if (isNaN(userValue)) {
									Morebits.Status.warn("Saving", 'القيمة التي حددتها لـ ' + pref.name + ' (' + pref.value + ') غير صالحة. سيستمر الحفظ، ولكن سيتم تخطي قيمة البيانات غير الصالحة.');
									userValue = null;
								}
								break;

							case "set": // read from the set of check boxes
								userValue = [];
								if (pref.setDisplayOrder) {
									// read only those keys specified in the display order
									$.each(pref.setDisplayOrder, (itemkey, item) => {
										if (form[pref.name + "_" + item].checked) {
											userValue.push(item);
										}
									});
								} else {
									// read all the keys in the list of values
									$.each(pref.setValues, (itemkey) => {
										if (form[pref.name + "_" + itemkey].checked) {
											userValue.push(itemkey);
										}
									});
								}
								break;

							case "customList": // read from the jQuery data stored on the button object
								userValue = $(form[pref.name]).data("value");
								break;

							default:
								alert('twinkleconfig: نوع بيانات غير معروف للتفضيل ' + pref.name);
								break;
						}
					} else if (Twinkle.prefs) {
						// Retain the hidden preferences that may have customised by the user from twinkleoptions.js
						// undefined if not set
						userValue = Twinkle.prefs[pref.name];
					}
				}

				// only save those preferences that are *different* from the default
				if (userValue !== undefined && !compare(userValue, Twinkle.defaultConfig[pref.name])) {
					newConfig[pref.name] = userValue;
				}
			});
		});

		let text =
			'// twinkleoptions.js: ملف تفضيلات Twinkle الشخصية\n' +
			'//\n' +
			'// NOTE: أسهل طريقة لتغيير تفضيلات Twinkle الخاصة بك هي استخدام\n' +
			'// لوحة تفضيلات Twinkle، في [[' + Morebits.pageNameNorm + ']].\n' +
			'//\n' +
			'// هذا الملف يتم إنشاؤه تلقائيًا. أي تغييرات تجريها (بصرف النظر عن\n' +
			'// تغيير معلمات التكوين بطريقة JavaScript صالحة) سيتم\n' +
			'// الكتابة فوقها في المرة التالية التي تنقر فيها على "حفظ" في تفضيلات Twinkle\n' +
			'// اللوحة. إذا قمت بتعديل هذا الملف، فتأكد من استخدام JavaScript الصحيح.\n' +
			// eslint-disable-next-line no-useless-concat
			'// <no' + 'wiki>\n' +
			'\n' +
			'window.Twinkle.prefs = ';
		text += JSON.stringify(newConfig, null, 2);
		text +=
			';\n' +
			'\n' +
			// eslint-disable-next-line no-useless-concat
			'// </no' + 'wiki>\n' +
			'// End of twinkleoptions.js\n';

		pageobj.setPageText(text);
		pageobj.setEditSummary('حفظ تفضيلات Twinkle: تعديل تلقائي من [[:' + Morebits.pageNameNorm + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption("recreate");
		pageobj.save(Twinkle.config.saveSuccess);
	};

	Twinkle.config.saveSuccess = function twinkleconfigSaveSuccess(pageobj) {
		pageobj.getStatusElement().info('تم الحفظ بنجاح');

		const noticebox = document.createElement("div");
		noticebox.className = 'cdx-message cdx-message--success';
		noticebox.style.fontSize = '100%';
		noticebox.innerHTML = '<p><b>تم حفظ تفضيلات Twinkle الخاصة بك.</b> لرؤية التغييرات، ستحتاج إلى مسح ذاكرة التخزين المؤقت للمتصفح بالكامل (راجع <a href="' + mw.util.getUrl('WP:BYPASS') + '" title="WP:BYPASS">WP:BYPASS</a> للحصول على التعليمات).</p>';
		mw.loader.using('mediawiki.htmlform.codex.styles', () => {
			Morebits.Status.root.appendChild(noticebox);
		});
		const noticeclear = document.createElement("br");
		noticeclear.style.clear = "both";
		Morebits.Status.root.appendChild(noticeclear);
	};

	Twinkle.addInitCallback(Twinkle.config.init);
}());

// </nowiki>
