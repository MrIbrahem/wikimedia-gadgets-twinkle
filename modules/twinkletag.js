// <nowiki>

(function () {

	/*
	 ****************************************
	 *** twinkletag.js: Tag module
	 ****************************************
	 * Mode of invocation:     Tab ("Tag")
	 * Active on:              Existing articles and drafts; file pages with a corresponding file
	 *                         which is local (not on Commons); all redirects
	 */

	Twinkle.tag = function twinkletag() {
		// redirect tagging (exclude category redirects, which are all soft redirects and so shouldn't be tagged with rcats)
		if (Morebits.isPageRedirect() && mw.config.get('wgNamespaceNumber') !== 14) {
			Twinkle.tag.mode = 'redirect';
			Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'ضع قالب على التحويل');
			// file tagging
		} else if (mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById('mw-sharedupload') && document.getElementById('mw-imagepage-section-filehistory')) {
			Twinkle.tag.mode = 'file';
			Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'أضف قوالب صيانة إلى الملف');
			// article/draft article tagging
		} else if ([0, 118].includes(mw.config.get('wgNamespaceNumber')) && mw.config.get('wgCurRevisionId')) {
			Twinkle.tag.mode = 'article';
			// Can't remove tags when not viewing current version
			Twinkle.tag.canRemove = (mw.config.get('wgCurRevisionId') === mw.config.get('wgRevisionId')) &&
				// Disabled on latest diff because the diff slider could be used to slide
				// away from the latest diff without causing the script to reload
				!mw.config.get('wgDiffNewId');
			Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'أضف أو أزل قوالب صيانة المقالات');
		}
	};

	Twinkle.tag.checkedTags = [];

	Twinkle.tag.callback = function twinkletagCallback() {
		const Window = new Morebits.SimpleWindow(630, Twinkle.tag.mode === 'article' ? 500 : 400);
		Window.setScriptName('لمح البصر!');
		// anyone got a good policy/guideline/info page/instructional page link??
		Window.addFooterLink('Tag prefs', 'ويكيبيديا:Twinkle/Preferences#tag');
		Window.addFooterLink('Twinkle help', 'ويكيبيديا:لمح البصر/توثيق#tag');
		Window.addFooterLink('Give feedback', 'وب:لمح البصر');

		const form = new Morebits.QuickForm(Twinkle.tag.callback.evaluate);

		// if page is unreviewed, add a checkbox to the form so that user can pick whether or not to review it
		const isPatroller = mw.config.get('wgUserGroups').some((r) => ['patroller', 'sysop'].includes(r));
		if (isPatroller) {
			new mw.Api().get({
				action: 'pagetriagelist',
				format: 'json',
				page_id: mw.config.get('wgArticleId')
			}).then((response) => {
				// Figure out whether the article is marked as reviewed in PageTriage.
				// Recent articles will have a patrol_status that we can read.
				// For articles that have been out of the new pages feed for awhile, pages[0] will be undefined.
				const isReviewed = response.pagetriagelist.pages[0] ?
					response.pagetriagelist.pages[0].patrol_status > 0 :
					true;

				// if article is not marked as reviewed, show the "mark as reviewed" check box
				if (!isReviewed) {
					// Quickform is probably already rendered. Instead of using form.append(), we need to make an element and then append it using JQuery.
					const checkbox = new Morebits.QuickForm.Element({
						type: 'checkbox',
						list: [
							{
								label: 'ضع علامة على الصفحة على أنها تم فحصها/مراجعتها',
								value: 'patrol',
								name: 'patrol',
								checked: Twinkle.getPref('markTaggedPagesAsPatrolled')
							}
						]
					});
					const html = checkbox.render();
					$('.quickform').prepend(html);
				}
			});
		}

		form.append({
			type: 'input',
			label: 'تصفية قائمة القوالب:',
			name: 'quickfilter',
			size: '30',
			event: function twinkletagquickfilter() {
				// flush the DOM of all existing underline spans
				$allCheckboxDivs.find('.search-hit').each((i, e) => {
					const labelElement = e.parentElement;
					// This would convert <label>Hello <span class=search-hit>wo</span>rld</label>
					// to <label>Hello world</label>
					labelElement.innerHTML = labelElement.textContent;
				});

				if (this.value) {
					$allCheckboxDivs.hide();
					$allHeaders.hide();
					const searchString = this.value;
					const searchRegex = new RegExp(mw.util.escapeRegExp(searchString), 'i');

					$allCheckboxDivs.find('label').each(function () {
						const labelText = this.textContent;
						const searchHit = searchRegex.exec(labelText);
						if (searchHit) {
							const range = document.createRange();
							const textnode = this.childNodes[0];
							range.selectNodeContents(textnode);
							range.setStart(textnode, searchHit.index);
							range.setEnd(textnode, searchHit.index + searchString.length);
							const underlineSpan = $('<span>').addClass('search-hit').css('text-decoration', 'underline')[0];
							range.surroundContents(underlineSpan);
							this.parentElement.style.display = 'block'; // show
						}
					});
				} else {
					$allCheckboxDivs.show();
					$allHeaders.show();
				}
			}
		});

		switch (Twinkle.tag.mode) {
			case 'article':
				Window.setTitle('وضع قوالب صيانة المقالات');

				// Build sorting and lookup object flatObject, which is always
				// needed but also used to generate the alphabetical list
				Twinkle.tag.article.flatObject = {};
				Object.values(Twinkle.tag.article.tagList).forEach((group) => {
					Object.values(group).forEach((subgroup) => {
						if (Array.isArray(subgroup)) {
							subgroup.forEach((item) => {
								Twinkle.tag.article.flatObject[item.tag] = item;
							});
						} else {
							Twinkle.tag.article.flatObject[subgroup.tag] = subgroup;
						}
					});
				});

				form.append({
					type: 'select',
					name: 'sortorder',
					label: 'عرض هذه القائمة:',
					tooltip: 'يمكنك تغيير ترتيب العرض الافتراضي في تفضيلات توينكل الخاصة بك (WP:TWPREFS).',
					event: Twinkle.tag.updateSortOrder,
					list: [
						{ type: 'option', value: 'cat', label: 'حسب التصنيفات', selected: Twinkle.getPref('tagArticleSortOrder') === 'cat' },
						{ type: 'option', value: 'alpha', label: 'بالترتيب الأبجدي', selected: Twinkle.getPref('tagArticleSortOrder') === 'alpha' }
					]
				});

				if (!Twinkle.tag.canRemove) {
					const divElement = document.createElement('div');
					divElement.innerHTML = 'لإزالة القوالب الموجودة، يرجى فتح قائمة القوالب من النسخة الحالية للمقال';
					form.append({
						type: 'div',
						name: 'untagnotice',
						label: divElement
					});
				}

				form.append({
					type: 'div',
					id: 'tagWorkArea',
					className: 'morebits-scrollbox',
					style: 'max-height: 28em'
				});

				form.append({
					type: 'checkbox',
					list: [
						{
							label: 'تجميع داخل {{قضايا متعددة}} إن أمكن',
							value: 'group',
							name: 'group',
							tooltip: 'إذا تم تطبيق قالبين أو أكثر مدعومين بواسطة {{قضايا متعددة}} وتم تحديد هذا المربع، فسيتم تجميع جميع القوالب المدعومة داخل قالب {{قضايا متعددة}}.',
							checked: Twinkle.getPref('groupByDefault')
						}
					]
				});

				form.append({
					type: 'input',
					label: 'السبب',
					name: 'reason',
					tooltip: 'سبب اختياري لإضافته في ملخص التعديل. يوصى به عند إزالة القوالب.',
					size: '60'
				});

				break;

			case 'file':
				Window.setTitle('وضع قوالب صيانة الملفات');

				$.each(Twinkle.tag.fileList, (groupName, group) => {
					form.append({ type: 'header', label: groupName });
					form.append({ type: 'checkbox', name: 'tags', list: group });
				});

				if (Twinkle.getPref('customFileTagList').length) {
					form.append({ type: 'header', label: 'قوالب مخصصة' });
					form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customFileTagList') });
				}
				break;

			case 'redirect':
				Window.setTitle('وضع قوالب التحويلات');

				// If a tag has a restriction for this namespace or title, return true, so that we know not to display it in the list of check boxes.
				var isRestricted = function (item) {
					if (typeof item.restriction === 'undefined') {
						return false;
					}
					const namespace = mw.config.get('wgNamespaceNumber');
					switch (item.restriction) {
						case 'insideMainspaceOnly':
							if (namespace !== 0) {
								return true;
							}
							break;
						case 'outsideUserspaceOnly':
							if (namespace === 2 || namespace === 3) {
								return true;
							}
							break;
						case 'insideTalkNamespaceOnly':
							if (namespace % 2 !== 1 || namespace < 0) {
								return true;
							}
							break;
						case 'disambiguationPagesOnly':
							if (!mw.config.get('wgPageName').endsWith('_(disambiguation)')) {
								return true;
							}
							break;
						default:
							alert('Twinkle.tag: unknown restriction ' + item.restriction);
							break;
					}
					return false;
				};

				// Generate the HTML form with the list of redirect tags that the user can choose to apply.
				var i = 1;
				$.each(Twinkle.tag.redirectList, (groupName, group) => {
					form.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
					const subdiv = form.append({ type: 'div', id: 'tagSubdiv' + i++ });
					$.each(group, (subgroupName, subgroup) => {
						subdiv.append({ type: 'div', label: [Morebits.htmlNode('b', subgroupName)] });
						subdiv.append({
							type: 'checkbox',
							name: 'tags',
							list: subgroup
								.filter((item) => !isRestricted(item))
								.map((item) => ({ value: item.tag, label: '{{' + item.tag + '}}: ' + item.description, subgroup: item.subgroup }))
						});
					});
				});

				if (Twinkle.getPref('customRedirectTagList').length) {
					form.append({ type: 'header', label: 'قوالب مخصصة' });
					form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customRedirectTagList') });
				}
				break;

			default:
				alert('Twinkle.tag: unknown mode ' + Twinkle.tag.mode);
				break;
		}

		form.append({ type: 'submit', className: 'tw-tag-submit' });

		const result = form.render();
		Window.setContent(result);
		Window.display();

		// for quick filter:
		$allCheckboxDivs = $(result).find('[name$=tags]').parent();
		$allHeaders = $(result).find('h5, .quickformDescription');
		result.quickfilter.focus(); // place cursor in the quick filter field as soon as window is opened
		result.quickfilter.autocomplete = 'off'; // disable browser suggestions
		result.quickfilter.addEventListener('keypress', (e) => {
			if (e.keyCode === 13) { // prevent enter key from accidentally submitting the form
				e.preventDefault();
				return false;
			}
		});

		if (Twinkle.tag.mode === 'article') {

			Twinkle.tag.alreadyPresentTags = [];

			if (Twinkle.tag.canRemove) {
				// Look for existing maintenance tags in the lead section and put them in array

				// All tags are HTML table elements that are direct children of .mw-parser-output,
				// except when they are within {{مشكلات متعددة}}
				$('.mw-parser-output').children().each((i, e) => {

					// break out on encountering the first heading, which means we are no
					// longer in the lead section
					if (e.classList.contains('mw-heading')) {
						return false;
					}

					// The ability to remove tags depends on the template's {{صندوق رسالة مقالة}} |name=
					// parameter bearing the template's correct name (preferably) or a name that at
					// least redirects to the actual name

					// All tags have their first class name as "box-" + template name
					if (e.className.indexOf('box-') === 0) {
						if (e.classList[0] === 'box-Multiple_issues') {
							$(e).find('.ambox').each((idx, e) => {
								if (e.classList[0].indexOf('box-') === 0) {
									const tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
									Twinkle.tag.alreadyPresentTags.push(tag);
								}
							});
							return true; // continue
						}

						const tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
						Twinkle.tag.alreadyPresentTags.push(tag);
					}
				});

				// {{غير مصنفة}} and {{تحسين تصنيف}} are usually placed at the end
				if ($('.box-Uncategorized').length) {
					Twinkle.tag.alreadyPresentTags.push('Uncategorized');
				}
				if ($('.box-Improve_categories').length) {
					Twinkle.tag.alreadyPresentTags.push('Improve categories');
				}

			}

			// Add status text node after Submit button
			const statusNode = document.createElement('small');
			statusNode.id = 'tw-tag-status';
			Twinkle.tag.status = {
				// initial state; defined like this because these need to be available for reference
				// in the click event handler
				numAdded: 0,
				numRemoved: 0
			};
			$('button.tw-tag-submit').after(statusNode);

			// fake a change event on the sort dropdown, to initialize the tag list
			const evt = document.createEvent('Event');
			evt.initEvent('change', true, true);
			result.sortorder.dispatchEvent(evt);
		} else {
			// Redirects and files: Add a link to each template's description page
			Morebits.QuickForm.getElements(result, 'tags').forEach(generateLinks);
		}
	};

	// $allCheckboxDivs and $allHeaders are defined globally, rather than in the
	// quickfilter event function, to avoid having to recompute them on every keydown
	let $allCheckboxDivs, $allHeaders;

	Twinkle.tag.updateSortOrder = function (e) {
		const form = e.target.form;
		const sortorder = e.target.value;
		Twinkle.tag.checkedTags = form.getChecked('tags');

		const container = new Morebits.QuickForm.Element({ type: 'fragment' });

		// function to generate a checkbox, with appropriate subgroup if needed
		const makeCheckbox = function (item) {
			const tag = item.tag, description = item.description;
			const checkbox = { value: tag, label: '{{' + tag + '}}: ' + description };
			if (Twinkle.tag.checkedTags.includes(tag)) {
				checkbox.checked = true;
			}
			checkbox.subgroup = item.subgroup;
			return checkbox;
		};

		const makeCheckboxesForAlreadyPresentTags = function () {
			container.append({ type: 'header', id: 'tagHeader0', label: 'القوالب الموجودة بالفعل' });
			const subdiv = container.append({ type: 'div', id: 'tagSubdiv0' });
			const checkboxes = [];
			const unCheckedTags = e.target.form.getUnchecked('existingTags');
			Twinkle.tag.alreadyPresentTags.forEach((tag) => {
				const checkbox =
				{
					value: tag,
					label: '{{' + tag + '}}' + (Twinkle.tag.article.flatObject[tag] ? ': ' + Twinkle.tag.article.flatObject[tag].description : ''),
					checked: !unCheckedTags.includes(tag),
					style: 'font-style: italic'
				};

				checkboxes.push(checkbox);
			});
			subdiv.append({
				type: 'checkbox',
				name: 'existingTags',
				list: checkboxes
			});
		};

		if (sortorder === 'cat') { // categorical sort order
			// function to iterate through the tags and create a checkbox for each one
			const doCategoryCheckboxes = function (subdiv, subgroup) {
				const checkboxes = [];
				$.each(subgroup, (k, item) => {
					if (!Twinkle.tag.alreadyPresentTags.includes(item.tag)) {
						checkboxes.push(makeCheckbox(item));
					}
				});
				subdiv.append({
					type: 'checkbox',
					name: 'tags',
					list: checkboxes
				});
			};

			if (Twinkle.tag.alreadyPresentTags.length > 0) {
				makeCheckboxesForAlreadyPresentTags();
			}
			let i = 1;
			// go through each category and sub-category and append lists of checkboxes
			$.each(Twinkle.tag.article.tagList, (groupName, group) => {
				container.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
				const subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
				if (Array.isArray(group)) {
					doCategoryCheckboxes(subdiv, group);
				} else {
					$.each(group, (subgroupName, subgroup) => {
						subdiv.append({ type: 'div', label: [Morebits.htmlNode('b', subgroupName)] });
						doCategoryCheckboxes(subdiv, subgroup);
					});
				}
			});
		} else { // alphabetical sort order
			if (Twinkle.tag.alreadyPresentTags.length > 0) {
				makeCheckboxesForAlreadyPresentTags();
				container.append({ type: 'header', id: 'tagHeader1', label: 'القوالب المتاحة' });
			}

			// Avoid repeatedly resorting
			Twinkle.tag.article.alphabeticalList = Twinkle.tag.article.alphabeticalList || Object.keys(Twinkle.tag.article.flatObject).sort();
			const checkboxes = [];
			Twinkle.tag.article.alphabeticalList.forEach((tag) => {
				if (!Twinkle.tag.alreadyPresentTags.includes(tag)) {
					checkboxes.push(makeCheckbox(Twinkle.tag.article.flatObject[tag]));
				}
			});
			container.append({
				type: 'checkbox',
				name: 'tags',
				list: checkboxes
			});
		}

		// append any custom tags
		if (Twinkle.getPref('customTagList').length) {
			container.append({ type: 'header', label: 'قوالب مخصصة' });
			container.append({
				type: 'checkbox', name: 'tags',
				list: Twinkle.getPref('customTagList').map((el) => {
					el.checked = Twinkle.tag.checkedTags.includes(el.value);
					return el;
				})
			});
		}

		const $workarea = $(form).find('#tagWorkArea');
		const rendered = container.render();
		$workarea.empty().append(rendered);

		// for quick filter:
		$allCheckboxDivs = $workarea.find('[name=tags], [name=existingTags]').parent();
		$allHeaders = $workarea.find('h5, .quickformDescription');
		form.quickfilter.value = ''; // clear search, because the search results are not preserved over mode change
		form.quickfilter.focus();

		// style adjustments
		$workarea.find('h5').css({ 'font-size': '110%' });
		$workarea.find('h5:not(:first-child)').css({ 'margin-top': '1em' });
		$workarea.find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });

		Morebits.QuickForm.getElements(form, 'existingTags').forEach(generateLinks);
		Morebits.QuickForm.getElements(form, 'tags').forEach(generateLinks);

		// tally tags added/removed, update statusNode text
		const statusNode = document.getElementById('tw-tag-status');
		$('[name=tags], [name=existingTags]').on('click', function () {
			if (this.name === 'tags') {
				Twinkle.tag.status.numAdded += this.checked ? 1 : -1;
			} else if (this.name === 'existingTags') {
				Twinkle.tag.status.numRemoved += this.checked ? -1 : 1;
			}

			const firstPart = 'إضافة ' + Twinkle.tag.status.numAdded + ' قالب' + (Twinkle.tag.status.numAdded > 1 ? 's' : '');
			const secondPart = 'إزالة ' + Twinkle.tag.status.numRemoved + ' قالب' + (Twinkle.tag.status.numRemoved > 1 ? 's' : '');
			statusNode.textContent =
				(Twinkle.tag.status.numAdded ? '  ' + firstPart : '') +
				(Twinkle.tag.status.numRemoved ? (Twinkle.tag.status.numAdded ? '; ' : '  ') + secondPart : '');
		});
	};

	/**
	 * Adds a link to each template's description page
	 *
	 * @param {Morebits.QuickForm.Element} checkbox  associated with the template
	 */
	var generateLinks = function (checkbox) {
		const link = Morebits.htmlNode('a', '>');
		link.setAttribute('class', 'tag-template-link');
		const tagname = checkbox.values;
		link.setAttribute('href', mw.util.getUrl(
			(!tagname.includes(':') ? 'Template:' : '') +
			(!tagname.includes('|') ? tagname : tagname.slice(0, tagname.indexOf('|')))
		));
		link.setAttribute('target', '_blank');
		$(checkbox).parent().append(['\u00A0', link]);
	};

	// Tags for ARTICLES start here
	Twinkle.tag.article = {};

	// Shared across {{Rough translation}} and {{ترجمة غير مكتملة}}
	const translationSubgroups = [
		{
			name: 'translationLanguage',
			parameter: '1',
			type: 'input',
			label: 'لغة المقال (إذا كانت معروفة):',
			tooltip: 'يرجى الاطلاع على [[WP:LRC]] للحصول على المساعدة. إذا كنت تدرج المقال في PNT، فيرجى محاولة تجنب ترك هذا المربع فارغًا، ما لم تكن غير متأكد تمامًا.'
		}
	].concat(mw.config.get('wgNamespaceNumber') === 0 ? [
		{
			type: 'checkbox',
			list: [{
				name: 'translationPostAtPNT',
				label: 'أدرج هذا المقال في ويكيبيديا:صفحات تحتاج إلى ترجمة إلى الإنجليزية (PNT)',
				checked: true
			}]
		},
		{
			name: 'translationComments',
			type: 'textarea',
			label: 'تعليقات إضافية لنشرها في PNT',
			tooltip: 'اختياري، وذو صلة فقط إذا تم تحديد "أدرج هذا المقال ..." أعلاه.'
		}
	] : []);

	// Subgroups for {{دمج}}, {{دمج إلى}} and {{دمج من}}
	const getMergeSubgroups = function (tag) {
		let otherTagName = 'دمج';
		switch (tag) {
			case 'Merge from':
				otherTagName = 'دمج إلى';
				break;
			case 'Merge to':
				otherTagName = 'دمج من';
				break;
			// no default
		}
		return [
			{
				name: 'mergeTarget',
				type: 'input',
				label: 'مقالات أخرى:',
				tooltip: 'إذا كنت تحدد مقالات متعددة، فافصل بينها بأحرف الأنابيب: مقال واحد|مقال اثنان',
				required: true
			},
			{
				type: 'checkbox',
				list: [
					{
						name: 'mergeTagOther',
						label: 'ضع قالبًا على المقال الآخر بقالب {{' + otherTagName + '}}',
						checked: true,
						tooltip: 'متاح فقط إذا تم إدخال اسم مقال واحد.'
					}
				]
			}
		].concat(mw.config.get('wgNamespaceNumber') === 0 ? {
			name: 'mergeReason',
			type: 'textarea',
			label: 'مبررات الدمج (سيتم نشرها في صفحة نقاش ' +
				(tag === 'Merge to' ? 'المقال الآخر' : 'هذا المقال') + '):',
			tooltip: 'اختياري، ولكنه موصى به بشدة. اتركه فارغًا إذا لم يكن مطلوبًا. متاح فقط إذا تم إدخال اسم مقال واحد.'
		} : []);
	};

	// Tags arranged by category; will be used to generate the alphabetical list,
	// but tags should be in alphabetical order within the categories
	// excludeMI: true indicate a tag that *does not* work inside {{مشكلات متعددة}}
	// Add new categories with discretion - the list is long enough as is!
	Twinkle.tag.article.tagList = {
		'قوالب التنظيف والصيانة': {
			'تنظيف عام': [
				{
					tag: 'Cleanup', description: 'يتطلب تنظيف',
					subgroup: {
						name: 'cleanup',
						parameter: 'reason',
						type: 'input',
						label: 'سبب محدد لضرورة التنظيف:',
						tooltip: 'مطلوب.',
						size: 35,
						required: true
					}
				}, // has a subgroup with text input
				{
					tag: 'Cleanup rewrite',
					description: 'يحتاج إلى إعادة كتابته بالكامل ليتوافق مع معايير الجودة في ويكيبيديا'
				},
				{
					tag: 'Copy edit',
					description: 'يتطلب تحريرًا لغويًا للقواعد أو الأسلوب أو التماسك أو اللهجة أو الإملاء',
					subgroup: {
						name: 'copyEdit',
						parameter: 'for',
						type: 'input',
						label: '"قد يتطلب هذا المقال تحريرًا لغويًا من أجل..."',
						tooltip: 'على سبيل المثال "إملاء متناسق". اختياري.',
						size: 35
					}
				} // has a subgroup with text input
			],
			'محتوى غير مرغوب فيه': [
				{
					tag: 'Close paraphrasing',
					description: 'يحتوي على إعادة صياغة دقيقة لمصدر محمي بحقوق الطبع والنشر غير مجاني',
					subgroup: {
						name: 'closeParaphrasing',
						parameter: 'source',
						type: 'input',
						label: 'المصدر:',
						tooltip: 'المصدر الذي تمت إعادة صياغته بدقة'
					}
				},
				{
					tag: 'Copypaste',
					description: 'يبدو أنه تم نسخه ولصقه من موقع آخر',
					excludeMI: true,
					subgroup: {
						name: 'copypaste',
						parameter: 'url',
						type: 'input',
						label: 'عنوان URL للمصدر:',
						tooltip: 'إذا كان معروفًا.',
						size: 50
					}
				}, // has a subgroup with text input
				{ tag: 'AI-generated', description: 'يبدو أن المحتوى تم إنشاؤه بواسطة نموذج لغوي كبير' },
				{ tag: 'External links', description: 'قد لا تتبع الروابط الخارجية سياسات المحتوى أو الإرشادات' },
				{ tag: 'Non-free', description: 'قد يحتوي على استخدام مفرط أو غير لائق للمواد المحمية بحقوق الطبع والنشر' }
			],
			'التركيب والتنسيق والمقدمة': [
				{ tag: 'Cleanup reorganize', description: 'يحتاج إلى إعادة تنظيم ليتوافق مع إرشادات التخطيط في ويكيبيديا' },
				{ tag: 'Lead missing', description: 'لا توجد مقدمة' },
				{ tag: 'Lead rewrite', description: 'تحتاج المقدمة إلى إعادة كتابتها للامتثال للإرشادات' },
				{ tag: 'Lead too long', description: 'المقدمة طويلة جدًا بالنسبة لطول المقال' },
				{ tag: 'Lead too short', description: 'المقدمة قصيرة جدًا ويجب توسيعها لتلخيص النقاط الرئيسية' },
				{ tag: 'Sections', description: 'يحتاج إلى تقسيم إلى أقسام حسب الموضوع' },
				{ tag: 'Too many sections', description: 'عدد كبير جدًا من رؤوس الأقسام التي تقسم المحتوى، يجب تكثيفها' },
				{ tag: 'Very long', description: 'طويل جدًا بحيث لا يمكن قراءته والتنقل فيه بشكل مريح' }
			],
			'تنظيف متعلق بالخيال': [
				{ tag: 'All plot', description: 'ملخص الحبكة بالكامل تقريبًا' },
				{ tag: 'Fiction', description: 'يفشل في التمييز بين الحقيقة والخيال' },
				{ tag: 'In-universe', description: 'الموضوع خيالي ويحتاج إلى إعادة كتابة لتقديم منظور غير خيالي' },
				{ tag: 'Long plot', description: 'ملخص الحبكة طويل جدًا أو مفصل بشكل مفرط' },
				{ tag: 'More plot', description: 'ملخص الحبكة قصير جدًا' },
				{ tag: 'No plot', description: 'يحتاج إلى ملخص الحبكة' }
			]
		},
		'مشاكل المحتوى العامة': {
			'الأهمية والملاحظة': [
				{
					tag: 'Notability', description: 'قد لا يفي الموضوع بالإرشادات العامة للملاحظة',
					subgroup: {
						name: 'notability',
						parameter: '1',
						type: 'select',
						list: [
							{ label: "{{ملحوظية}}: قد لا يفي موضوع المقال بالإرشادات العامة للملاحظة", value: '' },
							{ label: '{{ملحوظية|Academics}}: إرشادات الملاحظة للأكاديميين', value: 'Academics' },
							{ label: '{{ملحوظية|Astro}}: إرشادات الملاحظة للأجرام الفلكية', value: 'Astro' },
							{ label: '{{ملحوظية|Biographies}}: إرشادات الملاحظة للسير الذاتية', value: 'Biographies' },
							{ label: '{{ملحوظية|Books}}: إرشادات الملاحظة للكتب', value: 'Books' },
							{ label: '{{ملحوظية|Companies}}: إرشادات الملاحظة للشركات', value: 'Companies' },
							{ label: '{{ملحوظية|Events}}: إرشادات الملاحظة للأحداث', value: 'Events' },
							{ label: '{{ملحوظية|Films}}: إرشادات الملاحظة للأفلام', value: 'Films' },
							{ label: '{{ملحوظية|Geographic}}: إرشادات الملاحظة للمعالم الجغرافية', value: 'Geographic' },
							{ label: '{{ملحوظية|Lists}}: إرشادات الملاحظة للقوائم المستقلة', value: 'Lists' },
							{ label: '{{ملحوظية|Music}}: إرشادات الملاحظة للموسيقى', value: 'Music' },
							{ label: '{{ملحوظية|Neologisms}}: إرشادات الملاحظة للكلمات الجديدة', value: 'Neologisms' },
							{ label: '{{ملحوظية|Numbers}}: إرشادات الملاحظة للأرقام', value: 'Numbers' },
							{ label: '{{ملحوظية|Organizations}}: إرشادات الملاحظة للمنظمات', value: 'Organizations' },
							{ label: '{{ملحوظية|Products}}: إرشادات الملاحظة للمنتجات والخدمات', value: 'Products' },
							{ label: '{{ملحوظية|Sports}}: إرشادات الملاحظة للرياضة وألعاب القوى', value: 'Sports' },
							{ label: '{{ملحوظية|Television}}: إرشادات الملاحظة للبرامج التلفزيونية', value: 'Television' },
							{ label: '{{ملحوظية|Web}}: إرشادات الملاحظة لمحتوى الويب', value: 'Web' }
						]
					}
				}
			],
			'أسلوب الكتابة': [
				{
					tag: 'Cleanup press release', description: 'يشبه البيان الصحفي أو المقال الإخباري',
					subgroup: {
						type: 'hidden',
						name: 'cleanupPR1',
						parameter: '1',
						value: 'article'
					}
				},
				{ tag: 'Cleanup tense', description: 'لا يتبع الإرشادات الخاصة باستخدام الأزمنة المختلفة.' },
				{ tag: 'Essay-like', description: 'مكتوب مثل انعكاس شخصي أو مقال شخصي أو مقال جدلي' },
				{ tag: 'Fanpov', description: 'مكتوب من وجهة نظر أحد المعجبين' },
				{ tag: 'Inappropriate person', description: 'يستخدم ضمير المتكلم أو المخاطب بشكل غير لائق' },
				{ tag: 'Manual', description: 'مكتوب مثل دليل أو كتاب إرشادات' },
				{ tag: 'Over-quotation', description: 'يوجد الكثير جدًا من الاقتباسات أو الاقتباسات الطويلة جدًا لإدخال موسوعي' },
				{ tag: 'Promotional', description: 'يحتوي على محتوى ترويجي أو مكتوب مثل إعلان' },
				{ tag: 'Prose', description: 'مكتوب بتنسيق قائمة ولكنه قد يقرأ بشكل أفضل كنثر' },
				{ tag: 'Resume-like', description: 'مكتوب مثل سيرة ذاتية' },
				{ tag: 'Technical', description: 'تقني جدًا بحيث لا يستطيع معظم القراء فهمه' },
				{ tag: 'Tone', description: 'قد لا تعكس اللهجة أو الأسلوب اللهجة الموسوعية المستخدمة في ويكيبيديا' }
			],
			'الحس (أو عدم وجوده)': [
				{ tag: 'Confusing', description: 'مربك أو غير واضح' },
				{ tag: 'Incomprehensible', description: 'من الصعب جدًا فهمه أو غير مفهوم' },
				{ tag: 'Unfocused', description: 'يفتقر إلى التركيز أو يدور حول أكثر من موضوع واحد' }
			],
			'المعلومات والتفاصيل': [
				{ tag: 'Context', description: 'سياق غير كافٍ لأولئك غير المألوفين بالموضوع' },
				{ tag: 'Excessive examples', description: 'قد يحتوي على أمثلة عشوائية أو مفرطة أو غير ذات صلة' },
				{
					tag: 'Expert needed', description: 'يحتاج إلى اهتمام من خبير في هذا الموضوع',
					subgroup: [
						{
							name: 'expertNeeded',
							parameter: '1',
							type: 'input',
							label: 'اسم ويكي للمشروع ذي الصلة:',
							tooltip: 'اختياريًا، أدخل اسم ويكي للمشروع الذي قد يكون قادرًا على المساعدة في تجنيد خبير. لا تقم بتضمين البادئة "WikiProject".'
						},
						{
							name: 'expertNeededReason',
							parameter: 'reason',
							type: 'input',
							label: 'السبب:',
							tooltip: 'شرح موجز يصف المشكلة. إما السبب أو رابط المناقشة مطلوب.'
						},
						{
							name: 'expertNeededTalk',
							parameter: 'talk',
							type: 'input',
							label: 'مناقشة النقاش:',
							tooltip: 'اسم قسم صفحة نقاش هذا المقال حيث تتم مناقشة المشكلة. لا تعط رابطًا، فقط اسم القسم. إما السبب أو رابط المناقشة مطلوب.'
						}
					]
				},
				{ tag: 'Overly detailed', description: 'كمية مفرطة من التفاصيل المعقدة' },
				{ tag: 'Undue weight', description: 'يميل إلى إعطاء وزن غير مبرر لأفكار أو حوادث أو خلافات معينة' }
			],
			Timeliness: [
				{ tag: 'Current', description: 'يوثق حدثًا حاليًا', excludeMI: true }, // Works but not intended for use in MI
				{ tag: 'Current related', description: 'يوثق موضوعًا متأثرًا بحدث حالي', excludeMI: true }, // Works but not intended for use in MI
				{
					tag: 'Update', description: 'يحتاج إلى إضافة معلومات محدثة إضافية',
					subgroup: [
						{
							name: 'updatePart',
							parameter: 'part',
							type: 'input',
							label: 'ما هو جزء المقال:',
							tooltip: 'الجزء الذي يحتاج إلى تحديث',
							size: '45'
						},
						{
							name: 'updateReason',
							parameter: 'reason',
							type: 'input',
							label: 'السبب:',
							tooltip: 'شرح سبب قدم المقال',
							size: '55'
						}
					]
				}
			],
			'الحياد والتحيز والدقة الواقعية': [
				{ tag: 'Autobiography', description: 'سيرة ذاتية وقد لا تكون مكتوبة بحيادية' },
				{
					tag: 'COI', description: 'قد يكون للمنشئ أو المساهم الرئيسي تضارب في المصالح', subgroup: mw.config.get('wgNamespaceNumber') === 0 ? {
						name: 'coiReason',
						type: 'textarea',
						label: 'شرح لقالب COI (سيتم نشره في صفحة نقاش هذا المقال):',
						tooltip: 'اختياري، ولكنه موصى به بشدة. اتركه فارغًا إذا لم يكن مطلوبًا.'
					} : []
				},
				{ tag: 'Disputed', description: 'دقة واقعية مشكوك فيها' },
				{ tag: 'Fringe theories', description: 'يعرض النظريات الهامشية على أنها آراء سائدة' },
				{
					tag: 'Globalize', description: 'قد لا يمثل وجهة نظر عالمية للموضوع',
					subgroup: [
						{
							type: 'hidden',
							name: 'globalize1',
							parameter: '1',
							value: 'article'
						}, {
							name: 'globalizeRegion',
							parameter: '2',
							type: 'input',
							label: 'البلد أو المنطقة الممثلة بشكل مفرط'
						}
					]
				},
				{ tag: 'Hoax', description: 'قد يكون جزئيًا أو كليًا خدعة' },
				{ tag: 'Paid contributions', description: 'يحتوي على مساهمات مدفوعة، وبالتالي قد يتطلب تنظيفًا' },
				{ tag: 'Peacock', description: 'يحتوي على صيغة تعزز الموضوع بطريقة ذاتية دون إضافة معلومات' },
				{ tag: 'POV', description: 'لا يحافظ على وجهة نظر محايدة' },
				{ tag: 'Recentism', description: 'يميل نحو الأحداث الأخيرة' },
				{ tag: 'Too few opinions', description: 'قد لا يتضمن جميع وجهات النظر الهامة' },
				{ tag: 'Undisclosed paid', description: 'ربما تم إنشاؤه أو تعديله مقابل مدفوعات غير معلنة' },
				{ tag: 'Weasel', description: 'الحياد أو إمكانية التحقق معرضة للخطر بسبب استخدام كلمات ملتوية' }
			],
			'إمكانية التحقق والمصادر': [
				{ tag: 'BLP no footnotes', description: 'سيرة شخصية تفتقر إلى الاستشهادات المضمنة' },
				{ tag: 'BLP one source', description: 'سيرة شخصية تعتمد بشكل كبير أو كلي على مصدر واحد' },
				{ tag: 'BLP sources', description: 'سيرة شخصية تحتاج إلى مراجع أو مصادر إضافية للتحقق' },
				{ tag: 'BLP unreferenced', description: 'سيرة شخصية لا تستشهد بأي مصادر على الإطلاق (استخدم BLP PROD بدلاً من ذلك للمقالات الجديدة)' },
				{ tag: 'More citations needed', description: 'يحتاج إلى مراجع أو مصادر إضافية للتحقق' },
				{ tag: 'No significant coverage', description: 'لا يذكر أي مصادر تحتوي على تغطية كبيرة' },
				{ tag: 'No significant coverage (sports)', description: 'سيرة رياضية لا تذكر أي مصادر تحتوي على تغطية كبيرة' },
				{ tag: 'One source', description: 'يعتمد بشكل كبير أو كلي على مصدر واحد' },
				{ tag: 'Original research', description: 'يحتوي على بحث أصلي' },
				{ tag: 'Primary sources', description: 'يعتمد كثيرًا على الإشارات إلى المصادر الأولية، ويحتاج إلى مصادر ثانوية' },
				{ tag: 'Self-published', description: 'يحتوي على مراجع مفرطة أو غير مناسبة للمصادر المنشورة ذاتيًا' },
				{ tag: 'Sources exist', description: 'موضوع جدير بالملاحظة، تتوفر مصادر يمكن إضافتها إلى المقال' },
				{ tag: 'Third-party', description: 'يعتمد بشكل كبير جدًا على المصادر المرتبطة ارتباطًا وثيقًا بالموضوع' },
				{ tag: 'Unreferenced', description: 'لا يذكر أي مصادر على الإطلاق' },
				{ tag: 'Unreliable sources', description: 'قد لا تكون بعض المراجع موثوقة' },
				{ tag: 'User-generated', description: 'يحتوي على العديد من المراجع إلى المحتوى الذي أنشأه المستخدم (المنشور ذاتيًا)' }
			]
		},
		'مشاكل محتوى محددة': {
			Accessibility: [
				{ tag: 'Cleanup colors', description: 'يستخدم اللون كوسيلة وحيدة لنقل المعلومات' },
				{ tag: 'Overcoloured', description: 'يستخدم اللون بإفراط' }
			],
			Language: [
				{
					tag: 'Not English', description: 'مكتوب بلغة أخرى غير الإنجليزية ويحتاج إلى ترجمة',
					excludeMI: true,
					subgroup: translationSubgroups.slice(0, 1).concat([{
						type: 'checkbox',
						list: [
							{
								name: 'translationNotify',
								label: 'إخطار منشئ المقال',
								checked: true,
								tooltip: "يضع {{uw-notenglish}} في صفحة نقاش المنشئ."
							}
						]
					}]).concat(translationSubgroups.slice(1))
				},
				{
					tag: 'Rough translation', description: 'ترجمة سيئة من لغة أخرى', excludeMI: true,
					subgroup: translationSubgroups
				},
				{
					tag: 'Expand language', description: 'يجب توسيعه بنص مترجم من مقال بلغة أجنبية',
					excludeMI: true,
					subgroup: [{
						type: 'hidden',
						name: 'expandLangTopic',
						parameter: 'topic',
						value: '',
						required: true // force empty topic param in output
					}, {
						name: 'expandLanguageLangCode',
						parameter: 'langcode',
						type: 'input',
						label: 'رمز اللغة:',
						tooltip: 'رمز اللغة التي سيتم توسيع المقال منها',
						required: true
					}, {
						name: 'expandLanguageArticle',
						parameter: 'otherarticle',
						type: 'input',
						label: 'اسم المقال:',
						tooltip: 'اسم المقال المراد التوسع منه، بدون بادئة الإنترويكي'
					}]
				}
			],
			Links: [
				{ tag: 'Dead end', description: 'المقال ليس لديه روابط لمقالات أخرى' },
				{ tag: 'Orphan', description: 'المرتبطة من أي مقالات أخرى' },
				{ tag: 'Overlinked', description: 'يوجد الكثير جدًا من الروابط المكررة و/أو غير ذات الصلة لمقالات أخرى' },
				{ tag: 'Underlinked', description: 'يحتاج إلى المزيد من الروابط التشعبية إلى مقالات أخرى' }
			],
			'تقنية الإسناد': [
				{ tag: 'Citation style', description: 'أسلوب اقتباس غير واضح أو غير متناسق' },
				{ tag: 'Cleanup bare URLs', description: 'يستخدم عناوين URL مجردة للمراجع، والتي تكون عرضة لتعفن الارتباط' },
				{ tag: 'More footnotes needed', description: 'لديه بعض المراجع، ولكن استشهادات مضمنة غير كافية' },
				{ tag: 'No footnotes', description: 'لديه مراجع، لكنه يفتقر إلى الاستشهادات المضمنة' },
				{ tag: 'Parenthetical referencing', description: 'يستخدم الإسناد بين قوسين، وهو أمر مهمل في ويكيبيديا' }
			],
			Categories: [
				{ tag: 'Improve categories', description: 'يحتاج إلى تصنيفات إضافية أو أكثر تحديدًا', excludeMI: true },
				{ tag: 'Uncategorized', description: 'لم تتم إضافته إلى أي تصنيفات', excludeMI: true }
			]
		},
		Merging: [
			{
				tag: 'History merge',
				description: 'يجب دمج صفحة أخرى في هذا',
				excludeMI: true,
				subgroup: [
					{
						name: 'histmergeOriginalPage',
						parameter: 'originalpage',
						type: 'input',
						label: 'مقال آخر:',
						tooltip: 'اسم الصفحة التي يجب دمجها في هذا (مطلوب).',
						required: true
					},
					{
						name: 'histmergeReason',
						parameter: 'reason',
						type: 'input',
						label: 'السبب:',
						tooltip: 'شرح موجز يصف سبب الحاجة إلى دمج التاريخ. ربما يجب أن تبدأ بـ "لأن" وتنتهي بنقطة.'
					},
					{
						name: 'histmergeSysopDetails',
						parameter: 'details',
						type: 'input',
						label: 'تفاصيل إضافية:',
						tooltip: 'بالنسبة للحالات المعقدة، قدم تعليمات إضافية للمسؤول المراجع.'
					}
				]
			},
			{
				tag: 'Merge', description: 'يجب دمجها مع مقال آخر معين', excludeMI: true,
				subgroup: getMergeSubgroups('Merge')
			},
			{
				tag: 'Merge from', description: 'يجب دمج مقال آخر معين في هذا المقال', excludeMI: true,
				subgroup: getMergeSubgroups('Merge from')
			},
			{
				tag: 'Merge to', description: 'يجب دمجها في مقال آخر معين', excludeMI: true,
				subgroup: getMergeSubgroups('Merge to')
			}
		],
		Informational: [
			{ tag: 'GOCEinuse', description: 'يخضع حاليًا لعملية تحرير لغوي كبيرة من قبل نقابة المحررين اللغويين', excludeMI: true },
			{ tag: 'In use', description: 'يخضع لتحرير رئيسي لفترة قصيرة', excludeMI: true },
			{ tag: 'Under construction', description: 'في طور التوسع أو إعادة الهيكلة الرئيسية', excludeMI: true }
		]
	};

	// Tags for REDIRECTS start here
	// Not by policy, but the list roughly approximates items with >500
	// transclusions from Template:R template index
	Twinkle.tag.redirectList = {
		"القواعد وعلامات الترقيم والإملاء": {
			"الاختصار": [
				{ tag: 'R from acronym', description: 'تحويل من اختصار (مثل POTUS) إلى شكله الموسع', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from airport code', description: 'تحويل من رمز IATA أو ICAO للمطار إلى مقال المطار هذا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from airline code', description: 'تحويل من رمز IATA أو ICAO لشركة الطيران إلى مقال شركة الطيران هذا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from initialism', description: 'تحويل من حرف استهلالي (مثل حسن النية) إلى شكله الموسع', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from MathSciNet abbreviation', description: 'تحويل من اختصار عنوان منشور MathSciNet إلى العنوان غير المختصر', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from NLM abbreviation', description: 'تحويل من اختصار عنوان منشور NLM إلى العنوان غير المختصر', restriction: 'insideMainspaceOnly' }
			],
			"التهجئة": [
				{ tag: 'R from CamelCase', description: 'تحويل من عنوان CamelCase' },
				{ tag: 'R from other capitalisation', description: 'تحويل من عنوان بطريقة أخرى من التهجئة', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from miscapitalisation', description: 'تحويل من خطأ في التهجئة' }
			],
			"القواعد وعلامات الترقيم": [
				{ tag: 'R from modification', description: 'تحويل من تعديل لعنوان الهدف، مثل الكلمات المعاد ترتيبها' },
				{ tag: 'R from plural', description: 'تحويل من كلمة جمع إلى المكافئ المفرد', restriction: 'insideMainspaceOnly' },
				{ tag: 'R to plural', description: 'تحويل من اسم مفرد إلى صيغة الجمع', restriction: 'insideMainspaceOnly' }
			],
			"أجزاء من الكلام": [
				{ tag: 'R from verb', description: 'تحويل من فعل أو عبارة فعلية باللغة الإنجليزية', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from adjective', description: 'تحويل من صفة (كلمة أو عبارة تصف الاسم)', restriction: 'insideMainspaceOnly' }
			],
			"الإملاء": [
				{ tag: 'R from alternative spelling', description: 'تحويل من عنوان بإملاء بديل' },
				{ tag: 'R from alternative transliteration', description: 'تحويل من ترجمة صوتية إنجليزية بديلة إلى صيغة أكثر شيوعًا' },
				{ tag: 'R from ASCII-only', description: 'تحويل من عنوان بأحرف ASCII الأساسية فقط إلى العنوان الرسمي، مع اختلافات ليست علامات تشكيل أو وصلات' },
				{ tag: 'R to ASCII-only', description: 'تحويل إلى عنوان بأحرف ASCII الأساسية فقط من العنوان الرسمي، مع اختلافات ليست علامات تشكيل أو وصلات' },
				{ tag: 'R from diacritic', description: 'تحويل من اسم صفحة يحتوي على علامات التشكيل (النبرات، النقاط، إلخ)' },
				{ tag: 'R to diacritic', description: 'تحويل إلى عنوان المقال مع علامات التشكيل (النبرات، النقاط، إلخ)' },
				{ tag: 'R from misspelling', description: 'تحويل من خطأ إملائي أو خطأ مطبعي' }
			]
		},
		"أسماء بديلة": {
			"عام": [
				{
					tag: 'R from alternative language',
					description: 'تحويل من أو إلى عنوان بلغة أخرى',
					subgroup: [
						{
							name: 'altLangFrom',
							type: 'input',
							label: 'من لغة (رمز مكون من حرفين):',
							tooltip: 'أدخل رمزًا مكونًا من حرفين للغة التي يوجد بها اسم التحويل؛ مثل en للإنجليزية، de للألمانية'
						},
						{
							name: 'altLangTo',
							type: 'input',
							label: 'إلى لغة (رمز مكون من حرفين):',
							tooltip: 'أدخل رمزًا مكونًا من حرفين للغة التي يوجد بها الاسم المستهدف؛ مثل en للإنجليزية، de للألمانية'
						},
						{
							name: 'altLangInfo',
							type: 'div',
							label: $.parseHTML('<p>للحصول على قائمة برموز اللغات، انظر <a href="/wiki/Wp:Template_messages/Redirect_language_codes">Wikipedia:Template messages/Redirect language codes</a></p>')
						}
					]
				},
				{ tag: 'R from alternative name', description: 'تحويل من عنوان هو اسم آخر أو اسم مستعار أو لقب أو مرادف' },
				{ tag: 'R from ambiguous sort name', description: 'تحويل من اسم فرز غامض إلى صفحة أو قائمة تزيل الغموض عنه' },
				{ tag: 'R from former name', description: 'تحويل من اسم سابق أو تاريخي أو عنوان عمل', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from incomplete name', description: 'تحويل من اسم غير مكتمل' },
				{ tag: 'R from incorrect name', description: 'تحويل من اسم خاطئ غير مناسب كعنوان' },
				{ tag: 'R from less specific name', description: 'تحويل من عنوان أقل تحديدًا إلى عنوان أكثر تحديدًا وأقل عمومية' },
				{ tag: 'R from long name', description: 'تحويل من عنوان أكثر اكتمالاً' },
				{ tag: 'R from more specific name', description: 'تحويل من عنوان أكثر تحديدًا إلى عنوان أقل تحديدًا وأكثر عمومية' },
				{ tag: 'R from non-neutral name', description: 'تحويل من عنوان يحتوي على كلمة أو عبارة أو اسم غير محايد أو مهين أو مثير للجدل أو مسيء' },
				{ tag: 'R from short name', description: 'تحويل من عنوان هو شكل مختصر من الاسم الكامل للشخص أو عنوان الكتاب أو أي عنوان أكثر اكتمالاً' },
				{ tag: 'R from sort name', description: 'تحويل من اسم فرز الهدف، مثل البدء بلقبه بدلاً من اسمه الأول', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from synonym', description: 'تحويل من مرادف دلالي لعنوان الصفحة المستهدف' }
			],
			"أشخاص": [
				{ tag: 'R from birth name', description: 'تحويل من اسم ميلاد شخص إلى اسم أكثر شيوعًا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from given name', description: 'تحويل من اسم شخص', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from married name', description: 'تحويل من اسم زواج شخص إلى اسم أكثر شيوعًا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from name with title', description: 'تحويل من اسم شخص مسبوقًا أو متبوعًا بلقب إلى الاسم بدون لقب أو مع اللقب بين قوسين', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from person', description: 'تحويل من شخص أو أشخاص إلى مقال ذي صلة', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from personal name', description: 'تحويل من اسم شخص فردي إلى مقال بعنوان باسمه المهني أو باسمه المعروف', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from pseudonym', description: 'تحويل من اسم مستعار', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from surname', description: 'تحويل من عنوان هو لقب', restriction: 'insideMainspaceOnly' }
			],
			"تقني": [
				{ tag: 'R from drug trade name', description: 'تحويل من (أو إلى) الاسم التجاري لدواء إلى (أو من) الاسم الدولي غير المسجل الملكية (INN)' },
				{ tag: 'R from filename', description: 'تحويل من عنوان هو اسم ملف للهدف', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from molecular formula', description: 'تحويل من صيغة جزيئية/كيميائية إلى اسمها التقني أو التافه' },

				{ tag: 'R from gene symbol', description: 'تحويل من رمز منظمة الجينوم البشري (HUGO) لجين إلى مقال حول الجين', restriction: 'insideMainspaceOnly' }
			],
			"كائنات حية": [
				{ tag: 'R to scientific name', description: 'تحويل من الاسم الشائع إلى الاسم العلمي', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from scientific name', description: 'تحويل من الاسم العلمي إلى الاسم الشائع', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from alternative scientific name', description: 'تحويل من اسم علمي بديل إلى الاسم العلمي المقبول', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from scientific abbreviation', description: 'تحويل من اختصار علمي', restriction: 'insideMainspaceOnly' },
				{ tag: 'R to monotypic taxon', description: 'تحويل من العضو الوحيد ذي الرتبة الأدنى من تصنيف أحادي النمط إلى تصنيفه الأحادي النمط', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from monotypic taxon', description: 'تحويل من تصنيف أحادي النمط إلى عضوه الوحيد ذي الرتبة الأدنى', restriction: 'insideMainspaceOnly' },
				{ tag: 'R taxon with possibilities', description: 'تحويل من عنوان متعلق بكائن حي يحتمل أن يتم توسيعه في مقال', restriction: 'insideMainspaceOnly' }
			],
			"جغرافية": [
				{ tag: 'R from name and country', description: 'تحويل من الاسم المحدد إلى الاسم المختصر', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from more specific geographic name', description: 'تحويل من موقع جغرافي يتضمن معرفات خارجية مثل المقاطعة أو المنطقة من المدينة', restriction: 'insideMainspaceOnly' }
			]
		},
		"أدوات التنقل": {
			"الملاحة": [
				{ tag: 'R to anchor', description: 'تحويل من موضوع ليس له صفحة خاصة به إلى جزء مثبت من صفحة حول الموضوع' },
				{
					tag: 'R avoided double redirect',
					description: 'تحويل من عنوان بديل لتحويل آخر',
					subgroup: {
						name: 'doubleRedirectTarget',
						type: 'input',
						label: 'اسم هدف التحويل',
						tooltip: 'أدخل الصفحة التي سيستهدفها هذا التحويل إذا لم تكن الصفحة أيضًا تحويلًا'
					}
				},
				{ tag: 'R from file metadata link', description: 'تحويل رابط ويكي تم إنشاؤه من EXIF أو XMP أو معلومات أخرى (على سبيل المثال، قسم "بيانات التعريف" في بعض صفحات وصف الصور)', restriction: 'insideMainspaceOnly' },
				{ tag: 'R to list entry', description: 'تحويل إلى قائمة تحتوي على أوصاف موجزة للموضوعات غير جديرة بالملاحظة بما يكفي للحصول على مقالات منفصلة', restriction: 'insideMainspaceOnly' },

				{ tag: 'R mentioned in hatnote', description: 'تحويل من عنوان مذكور في حاشية في رأس التحويل' },
				{ tag: 'R to section', description: 'مشابه لـ {{R to list entry}}، ولكن عندما يتم تنظيم القائمة في أقسام، مثل قائمة الشخصيات في عالم خيالي' },
				{ tag: 'R from shortcut', description: 'تحويل من اختصار ويكيبيديا' },
				{ tag: 'R to subpage', description: 'تحويل إلى صفحة فرعية' }
			],
			"توضيح": [
				{ tag: 'R from ambiguous term', description: 'تحويل من اسم صفحة غامض إلى صفحة تزيل الغموض عنه. يجب ألا يظهر هذا القالب أبدًا على صفحة تحتوي على "(توضيح)" في عنوانها، استخدم R to disambiguation page بدلاً من ذلك' },
				{ tag: 'R to disambiguation page', description: 'تحويل إلى صفحة توضيح', restriction: 'disambiguationPagesOnly' },
				{ tag: 'R from incomplete disambiguation', description: 'تحويل من اسم صفحة غامض جدًا بحيث لا يمكن أن يكون عنوانًا لمقال ويجب أن يتم تحويله إلى صفحة توضيح مناسبة' },
				{ tag: 'R from incorrect disambiguation', description: 'تحويل من اسم صفحة بتوضيح غير صحيح بسبب خطأ أو مفهوم تحريري سابق' },
				{ tag: 'R from other disambiguation', description: 'تحويل من اسم صفحة مع مؤهل توضيح بديل' },
				{ tag: 'R from unnecessary disambiguation', description: 'تحويل من اسم صفحة يحتوي على مؤهل توضيح غير ضروري' }
			],
			"الدمج والتكرار والنقل": [
				{ tag: 'R from duplicated article', description: 'تحويل إلى مقال مشابه من أجل الحفاظ على تاريخ التحرير الخاص به' },
				{ tag: 'R with history', description: 'تحويل من صفحة تحتوي على سجل صفحة جوهري، يتم الاحتفاظ به للحفاظ على المحتوى والإسناد' },
				{ tag: 'R from move', description: 'تحويل من صفحة تم نقلها/إعادة تسميتها' },
				{ tag: 'R from merge', description: 'تحويل من صفحة مدمجة من أجل الحفاظ على تاريخ التحرير الخاص بها' }
			],
			"نطاق": [
				{ tag: 'R from remote talk page', description: 'تحويل من صفحة نقاش في أي نطاق نقاش إلى صفحة مقابلة تتم مشاهدتها بشكل مكثف', restriction: 'insideTalkNamespaceOnly' },
				{ tag: 'R to category namespace', description: 'تحويل من صفحة خارج نطاق التصنيف إلى صفحة فئة' },
				{ tag: 'R to help namespace', description: 'تحويل من أي صفحة داخل أو خارج نطاق المساعدة إلى صفحة في هذا النطاق' },
				{ tag: 'R to main namespace', description: 'تحويل من صفحة خارج نطاق المقالات الرئيسية إلى مقال في النطاق الرئيسي' },
				{ tag: 'R to portal namespace', description: 'تحويل من أي صفحة داخل أو خارج نطاق المدخل إلى صفحة في هذا النطاق' },
				{ tag: 'R to project namespace', description: 'تحويل من أي صفحة داخل أو خارج نطاق المشروع (Wikipedia: أو WP:) إلى أي صفحة في نطاق المشروع' },
				{ tag: 'R to user namespace', description: 'تحويل من صفحة خارج نطاق المستخدم إلى صفحة مستخدم (ليس إلى صفحة نقاش المستخدم)', restriction: 'outsideUserspaceOnly' }
			]
		},
		"وسائط": {
			"عام": [
				{ tag: 'R from album', description: 'تحويل من ألبوم إلى موضوع ذي صلة مثل فنان التسجيل أو قائمة الألبومات', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from band name', description: 'تحويل من اسم فرقة موسيقية أو مجموعة موسيقية يعيد توجيه مقال حول شخص واحد، أي قائد الفرقة أو المجموعة' },
				{ tag: 'R from book', description: 'تحويل من عنوان كتاب إلى مقال عام ذي صلة', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from cover song', description: 'تحويل من نسخة غلاف لأغنية إلى المقال حول الأغنية الأصلية التي تغطيها هذه النسخة' },
				{ tag: 'R from film', description: 'تحويل من عنوان فيلم هو موضوع فرعي للهدف أو عنوان بلغة بديلة تم إنتاجه بتلك اللغة', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from journal', description: 'تحويل من مقال في مجلة تجارية أو مهنية إلى مقال ويكيبيديا عام ذي صلة، مثل مؤلف المقال أو ناشره أو إلى العنوان بلغة بديلة' },
				{ tag: 'R from lyric', description: 'تحويل من كلمات أغنية إلى أغنية أو مصدر آخر يصف الكلمات' },
				{ tag: 'R from meme', description: 'تحويل من اسم ميم إنترنت أو ظاهرة ثقافة شعبية أخرى وهي موضوع فرعي لهدف التحويل' },
				{ tag: 'R from song', description: 'تحويل من عنوان أغنية إلى مقال عام ذي صلة' },
				{ tag: 'R from television episode', description: 'تحويل من عنوان حلقة تلفزيونية إلى عمل ذي صلة أو قوائم حلقات', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from television program', description: 'تحويل من عنوان برنامج تلفزيوني أو مسلسل تلفزيوني أو مسلسل ويب وهو موضوع فرعي لهدف التحويل' },
				{ tag: 'R from upcoming film', description: 'تحويل من عنوان يمكن توسيعه ليصبح مقالًا جديدًا أو نوعًا آخر من الصفحات المرتبطة مثل قالب جديد.' },
				{ tag: 'R from work', description: 'تحويل من عمل إبداعي موضوع ذي صلة مثل المؤلف/الفنان أو الناشر أو موضوع متعلق بالعمل' }
			],
			"خيال": [
				{ tag: 'R from fictional character', description: 'تحويل من شخصية خيالية إلى عمل خيالي ذي صلة أو قائمة شخصيات', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from fictional element', description: 'تحويل من عنصر خيالي (مثل كائن أو مفهوم) إلى عمل خيالي ذي صلة أو قائمة بالعناصر المماثلة', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from fictional location', description: 'تحويل من موقع أو إعداد خيالي إلى عمل خيالي ذي صلة أو قائمة بالأماكن', restriction: 'insideMainspaceOnly' }
			]
		},
		"متفرقات": {
			"معلومات ذات صلة": [
				{ tag: 'R to article without mention', description: 'تحويل إلى مقال بدون أي ذكر للكلمة أو العبارة المعاد توجيهها', restriction: 'insideMainspaceOnly' },
				{ tag: 'R to decade', description: 'تحويل من سنة إلى مقال العقد', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from domain name', description: 'تحويل من اسم نطاق إلى مقال حول موقع ويب', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from emoji', description: 'تحويل من رمز تعبيري إلى مقال يصف المفهوم المصور أو الرمز التعبيري نفسه' },
				{ tag: 'R from phrase', description: 'تحويل من عبارة إلى مقال عام ذي صلة يغطي الموضوع' },
				{ tag: 'R from list topic', description: 'تحويل من موضوع قائمة إلى القائمة المكافئة' },
				{ tag: 'R from member', description: 'تحويل من عضو في مجموعة إلى موضوع ذي صلة مثل المجموعة أو المنظمة' },
				{ tag: 'R to related topic', description: 'تحويل إلى مقال حول موضوع مشابه', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from related word', description: 'تحويل من كلمة ذات صلة' },
				{ tag: 'R from school', description: 'تحويل من مقال مدرسي يحتوي على معلومات قليلة جدًا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from subtopic', description: 'تحويل من عنوان هو موضوع فرعي للمقال المستهدف', restriction: 'insideMainspaceOnly' },
				{ tag: 'R to subtopic', description: 'تحويل إلى موضوع فرعي لعنوان التحويل', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from Unicode character', description: 'تحويل من حرف Unicode واحد إلى مقال أو صفحة مشروع ويكيبيديا تستنتج معنى للرمز', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from Unicode code', description: 'تحويل من نقطة رمز Unicode إلى مقال حول الحرف الذي تمثله', restriction: 'insideMainspaceOnly' }
			],
			"مع إمكانيات": [
				{ tag: 'R with possibilities', description: 'تحويل من عنوان معين إلى مقال عام أقل تفصيلاً (شيء يمكن وينبغي توسيعه)' }
			],
			"رموز ISO": [
				{ tag: 'R from ISO 4 abbreviation', description: 'تحويل من اختصار عنوان منشور ISO 4 إلى العنوان غير المختصر', restriction: 'insideMainspaceOnly' },
				{ tag: 'R from ISO 639 code', description: 'تحويل من عنوان هو رمز لغة ISO 639 إلى مقال حول اللغة', restriction: 'insideMainspaceOnly' }
			],
			"جدارة النشر": [
				{ tag: 'R printworthy', description: 'تحويل من عنوان سيكون مفيدًا في نسخة مطبوعة أو CD/DVD من ويكيبيديا', restriction: 'insideMainspaceOnly' },
				{ tag: 'R unprintworthy', description: 'تحويل من عنوان لن يكون مفيدًا في نسخة مطبوعة أو CD/DVD من ويكيبيديا', restriction: 'insideMainspaceOnly' }
			]
		}
	};

	// maintenance tags for FILES start here

	Twinkle.tag.fileList = {
		"قوالب مشاكل الترخيص والمصدر": [
			{ label: '{{مطلوب مصدر أفضل}}: تتكون معلومات المصدر من عنوان URL لصورة مجردة/عنوان URL أساسي عام فقط', value: 'Better source requested' },
			{ label: '{{وسائط قد تكون حرة}}: تم وضع علامة حاليًا بموجب ترخيص غير مجاني، ولكن قد يتوفر ترخيص مجاني', value: 'Maybe free media' },
			{ label: '{{تصغير حجم ملف غير حر}}: صورة استخدام عادل غير منخفضة الدقة (أو مقطع صوتي طويل جدًا، إلخ)', value: 'Non-free reduce' },
			{ label: '{{إصدارات غير حرة يتيمة}}: وسائط استخدام عادل مع مراجعات قديمة تحتاج إلى حذف', value: 'Orphaned non-free revisions' }
		],
		"قوالب متعلقة بويكيميديا كومنز": [
			{ label: '{{تصدير إلى كومنز}}: وسائط مجانية يجب نسخها إلى كومنز', value: 'Copy to Commons' },
			{
				label: '{{حذف من كومنز}}: تم حذف الملف مسبقًا من كومنز',
				value: 'Deleted on Commons',
				subgroup: {
					type: 'input',
					name: 'deletedOnCommonsName',
					label: 'الاسم في كومنز:',
					tooltip: 'اسم الصورة في كومنز (إذا كان مختلفًا عن الاسم المحلي)، باستثناء البادئة File:'
				}
			},
			{
				label: '{{لا تصدر لكومنز}}: الملف غير مناسب للنقل إلى كومنز',
				value: 'Do not move to Commons',
				subgroup: [
					{
						type: 'input',
						name: 'DoNotMoveToCommons_reason',
						label: 'السبب:',
						tooltip: 'أدخل السبب الذي يمنع نقل هذه الصورة إلى كومنز (مطلوب). إذا كان الملف ملكية عامة في الولايات المتحدة ولكن ليس في بلد المنشأ، فأدخل "US only"',
						required: true
					},
					{
						type: 'number',
						name: 'DoNotMoveToCommons_expiry',
						label: 'سنة انتهاء الصلاحية:',
						min: new Morebits.Date().getFullYear(),
						tooltip: 'إذا كان من الممكن نقل هذا الملف إلى كومنز بدءًا من سنة معينة، فيمكنك إدخالها هنا (اختياري).'
					}
				]
			},
			{
				label: '{{إبقاء نسخة محلية}}: طلب الاحتفاظ بنسخة محلية من ملف كومنز',
				value: 'Keep local',
				subgroup: {
					type: 'input',
					name: 'keeplocalName',
					label: 'اسم صورة كومنز إذا كان مختلفًا:',
					tooltip: 'اسم الصورة في كومنز (إذا كان مختلفًا عن الاسم المحلي)، باستثناء البادئة File:'
				}
			},
			{
				label: '{{رشح للحذف من كومنز}}: تم ترشيح الملف للحذف في كومنز',
				value: 'Nominated for deletion on Commons',
				subgroup: {
					type: 'input',
					name: 'nominatedOnCommonsName',
					label: 'الاسم في كومنز:',
					tooltip: 'اسم الصورة في كومنز (إذا كان مختلفًا عن الاسم المحلي)، باستثناء البادئة File:'
				}
			}
		],
		"قوالب التنظيف": [
			{ label: '{{آثار الضغط}}: يحتوي PNG على بقايا ضغط', value: 'Artifacts' },
			{ label: '{{خط رديئ}}: يستخدم SVG خطوطًا غير متوفرة على خادم الصور المصغرة', value: 'Bad font' },
			{ label: '{{ملف PDF رديئ}}: يجب تحويل ملف PDF/DOC/... إلى تنسيق أكثر فائدة', value: 'Bad format' },
			{ label: '{{صورة GIF رديئة}}: GIF يجب أن يكون PNG أو JPEG أو SVG', value: 'Bad GIF' },
			{ label: '{{صورة JPEG رديئة}}: JPEG يجب أن يكون PNG أو SVG', value: 'Bad JPEG' },
			{ label: '{{صورة SVG بعناصر نقطية}}: SVG مع مزيج من رسومات نقطية ومتجهة', value: 'Bad SVG' },
			{ label: '{{رسم رديء}}: SVG تم تتبعه تلقائيًا ويتطلب تنظيفًا', value: 'Bad trace' },
			{
				label: '{{تهذيب صورة}}: تنظيف عام', value: 'Cleanup image',
				subgroup: {
					type: 'input',
					name: 'cleanupimageReason',
					label: 'السبب:',
					tooltip: 'أدخل سبب التنظيف (مطلوب)',
					required: true
				}
			},
			{ label: '{{صور تستخدم كليرتايب}}: صورة (ليست لقطة شاشة) مع ClearType anti-aliasing', value: 'ClearType' },
			{ label: '{{صورة SVG لا تتضمن سوى رسوميات نقطية}}: SVG تحتوي فقط على رسومات نقطية بدون محتوى متجه حقيقي', value: 'Fake SVG' },
			{ label: '{{صورة بعلامة مائية}}: تحتوي الصورة على علامة مائية مرئية أو غير مرئية', value: 'Imagewatermark' },
			{ label: '{{لا عملات معدنية}}: صورة تستخدم عملات معدنية للإشارة إلى المقياس', value: 'NoCoins' },
			{ label: '{{صورة ذات ضغط JPEG مفرط}}: JPEG مع مستويات عالية من القطع الأثرية', value: 'Overcompressed JPEG' },
			{ label: '{{صورة بخلفية عتيمة}}: يجب أن تكون الخلفية غير الشفافة شفافة', value: 'Opaque' },
			{ label: '{{صورة بحاجة لإزالة الحدود}}: حدود غير ضرورية، نطاق بيضاء، إلخ.', value: 'Remove border' },
			{
				label: '{{إعادة تسمية وسائط}}: يجب إعادة تسمية الملف وفقًا للمعايير في [[WP:FMV]]',
				value: 'Rename media',
				subgroup: [
					{
						type: 'input',
						name: 'renamemediaNewname',
						label: 'اسم جديد:',
						tooltip: 'أدخل الاسم الجديد للصورة (اختياري)'
					},
					{
						type: 'input',
						name: 'renamemediaReason',
						label: 'السبب:',
						tooltip: 'أدخل سبب إعادة التسمية (اختياري)'
					}
				]
			},
			{ label: '{{يجب أن تكون بتنسيق PNG}}: يجب أن يكون GIF أو JPEG بدون فقدان للبيانات', value: 'Should be PNG' },
			{
				label: '{{يجب أن تكون بتنسيق SVG}}: يجب أن يكون PNG أو GIF أو JPEG رسومات متجهة', value: 'Should be SVG',
				subgroup: {
					name: 'svgCategory',
					type: 'select',
					list: [
						{ label: '{{يجب أن تكون بتنسيق SVG|other}}', value: 'other' },
						{ label: '{{يجب أن تكون بتنسيق SVG|alphabet}}: صور الأحرف، أمثلة الخطوط، إلخ.', value: 'alphabet' },
						{ label: '{{يجب أن تكون بتنسيق SVG|chemical}}: مخططات كيميائية، إلخ.', value: 'chemical' },
						{ label: '{{يجب أن تكون بتنسيق SVG|circuit}}: مخططات الدوائر الإلكترونية، إلخ.', value: 'circuit' },
						{ label: '{{يجب أن تكون بتنسيق SVG|coat of arms}}: شعارات النبالة', value: 'coat of arms' },
						{ label: '{{يجب أن تكون بتنسيق SVG|diagram}}: الرسوم البيانية التي لا تتناسب مع أي فئة فرعية أخرى', value: 'diagram' },
						{ label: '{{يجب أن تكون بتنسيق SVG|emblem}}: الشعارات، الشعارات الحرة/المفتوحة المصدر، الشارات، إلخ.', value: 'emblem' },
						{ label: '{{يجب أن تكون بتنسيق SVG|fair use}}: صور الاستخدام العادل، شعارات الاستخدام العادل', value: 'fair use' },
						{ label: '{{يجب أن تكون بتنسيق SVG|flag}}: أعلام', value: 'flag' },
						{ label: '{{يجب أن تكون بتنسيق SVG|graph}}: مخططات مرئية للبيانات', value: 'graph' },
						{ label: '{{يجب أن تكون بتنسيق SVG|logo}}: الشعارات', value: 'logo' },
						{ label: '{{يجب أن تكون بتنسيق SVG|map}}: الخرائط', value: 'map' },
						{ label: '{{يجب أن تكون بتنسيق SVG|music}}: المقاييس الموسيقية، النوتات، إلخ.', value: 'music' },
						{ label: '{{يجب أن تكون بتنسيق SVG|physical}}: صور "واقعية" للأشياء المادية، الناس، إلخ.', value: 'physical' },
						{ label: '{{يجب أن تكون بتنسيق SVG|symbol}}: رموز مختلفة، أيقونات، إلخ.', value: 'symbol' }
					]
				}
			},
			{ label: '{{يجب أن تكون بتنسيق نصي}}: يجب تمثيل الصورة كنص أو جداول أو ترميز رياضي', value: 'Should be text' }
		],
		"قوالب جودة الصورة": [
			{ label: '{{صورة خادعة}}: قد يتم التلاعب بالصورة أو تشكل خدعة', value: 'Image hoax' },
			{ label: '{{صورة متوهجة}}', value: 'Image-blownout' },
			{ label: '{{صورة ضبابية}}', value: 'Image-out-of-focus' },
			{
				label: '{{صورة منخفضة الجودة}}', value: 'Image-Poor-Quality',
				subgroup: {
					type: 'input',
					name: 'ImagePoorQualityReason',
					label: 'السبب:',
					tooltip: 'أدخل سبب سوء هذه الصورة (مطلوب)',
					required: true
				}
			},
			{ label: '{{صورة ضعيفة العرض}}', value: 'Image-underexposure' },
			{
				label: '{{هيكل كيميائي ضعيف الجودة}}: هياكل كيميائية متنازع عليها', value: 'Low quality chem',
				subgroup: {
					type: 'input',
					name: 'lowQualityChemReason',
					label: 'السبب:',
					tooltip: 'أدخل سبب النزاع حول الرسم التخطيطي (مطلوب)',
					required: true
				}
			}
		],
		"قوالب الاستبدال": [
			{ label: '{{ملف مهمل}}: نسخة محسنة متاحة', value: 'Obsolete' },
			{ label: '{{نسخة PNG متوفرة}}', value: 'PNG version available' },
			{ label: '{{نسخة متجهية متوفرة}}', value: 'Vector version available' }
		]
	};

	Twinkle.tag.fileList["قوالب الاستبدال"].forEach((el) => {
		el.subgroup = {
			type: 'input',
			label: 'ملف الاستبدال:',
			tooltip: 'أدخل اسم الملف الذي يحل محل هذا الملف (مطلوب)',
			name: el.value.replace(/ /g, '_') + 'File',
			required: true
		};
	});

	Twinkle.tag.callbacks = {
		article: function articleCallback(pageobj) {

			// Remove tags that become superfluous with this action
			let pageText = pageobj.getPageText().replace(/\{\{\s*([Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
			const params = pageobj.getCallbackParameters();

			/**
			 * Saves the page following the removal of tags if any. The last step.
			 * Called from removeTags()
			 */
			const postRemoval = function () {
				if (params.tagsToRemove.length) {
					// Remove empty {{مشكلات متعددة}} if found
					pageText = pageText.replace(/\{\{(multiple ?issues|article ?issues|mi)\s*\|\s*\}\}\n?/im, '');
					// Remove single-element {{مشكلات متعددة}} if found
					pageText = pageText.replace(/\{\{(?:multiple ?issues|article ?issues|mi)\s*\|\s*(\{\{[^}]+\}\})\s*\}\}/im, '$1');
				}

				// Build edit summary
				const makeSentence = function (array) {
					if (array.length < 3) {
						return array.join(' and ');
					}
					const last = array.pop();
					return array.join(', ') + ', and ' + last;
				};
				const makeTemplateLink = function (tag) {
					let text = '{{[[';
					// if it is a custom tag with a parameter
					if (tag.includes('|')) {
						tag = tag.slice(0, tag.indexOf('|'));
					}
					text += tag.includes(':') ? tag : 'Template:' + tag + '|' + tag;
					return text + ']]}}';
				};

				let summaryText;
				const addedTags = params.tags.map(makeTemplateLink);
				const removedTags = params.tagsToRemove.map(makeTemplateLink);
				if (addedTags.length) {
					summaryText = 'تمت إضافة ' + makeSentence(addedTags);
					summaryText += removedTags.length ? '; وتمت إزالة ' + makeSentence(removedTags) : '';
				} else {
					summaryText = 'تمت إزالة ' + makeSentence(removedTags);
				}
				summaryText += ' قالب' + (addedTags.length + removedTags.length > 1 ? 's' : '');
				if (params.reason) {
					summaryText += ': ' + params.reason;
				}

				// avoid truncated summaries
				if (summaryText.length > 499) {
					summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
				}

				pageobj.setPageText(pageText);
				pageobj.setEditSummary(summaryText);
				if ((mw.config.get('wgNamespaceNumber') === 0 && Twinkle.getPref('watchTaggedVenues').includes('articles')) || (mw.config.get('wgNamespaceNumber') === 118 && Twinkle.getPref('watchTaggedVenues').includes('drafts'))) {
					pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
				}
				pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
				pageobj.setCreateOption('nocreate');
				pageobj.save(() => {
					// COI: Start the discussion on the talk page (mainspace only)
					if (params.coiReason) {
						const coiTalkPage = new Morebits.wiki.Page('Talk:' + Morebits.pageNameNorm, 'بدء مناقشة في صفحة النقاش');
						coiTalkPage.setNewSectionText(params.coiReason + ' ~~~~');
						coiTalkPage.setNewSectionTitle('قالب COI (' + new Morebits.Date(pageobj.getLoadTime()).format('MMMM Y', 'utc') + ')');
						coiTalkPage.setChangeTags(Twinkle.changeTags);
						coiTalkPage.setCreateOption('recreate');
						coiTalkPage.newSection();
					}

					// Special functions for merge tags
					// Post a rationale on the talk page (mainspace only)
					if (params.mergeReason) {
						const mergeTalkPage = new Morebits.wiki.Page('Talk:' + params.discussArticle, 'نشر الأساس المنطقي في صفحة النقاش');
						mergeTalkPage.setNewSectionText(params.mergeReason.trim() + ' ~~~~');
						mergeTalkPage.setNewSectionTitle(params.talkDiscussionTitleLinked);
						mergeTalkPage.setChangeTags(Twinkle.changeTags);
						mergeTalkPage.setWatchlist(Twinkle.getPref('watchMergeDiscussions'));
						mergeTalkPage.setCreateOption('recreate');
						mergeTalkPage.newSection();
					}
					// Tag the target page (if requested)
					if (params.mergeTagOther) {
						let otherTagName = 'Merge';
						if (params.mergeTag === 'Merge from') {
							otherTagName = 'Merge to';
						} else if (params.mergeTag === 'Merge to') {
							otherTagName = 'Merge from';
						}
						const newParams = {
							tags: [otherTagName],
							tagsToRemove: [],
							tagsToRemain: [],
							mergeTarget: Morebits.pageNameNorm,
							discussArticle: params.discussArticle,
							talkDiscussionTitle: params.talkDiscussionTitle,
							talkDiscussionTitleLinked: params.talkDiscussionTitleLinked
						};
						const otherpage = new Morebits.wiki.Page(params.mergeTarget, 'وضع قالب على صفحة أخرى (' +
							params.mergeTarget + ')');
						otherpage.setChangeTags(Twinkle.changeTags);
						otherpage.setCallbackParameters(newParams);
						otherpage.load(Twinkle.tag.callbacks.article);
					}

					// Special functions for {{ترجمة غير مكتملة}} and {{rough translation}}
					// Post at WP:PNT (mainspace only)
					if (params.translationPostAtPNT) {
						const pntPage = new Morebits.wiki.Page('Wikipedia:Pages needing translation into English',
							'إدراج مقال في ويكيبيديا:صفحات تحتاج إلى ترجمة إلى الإنجليزية');
						pntPage.setFollowRedirect(true);
						pntPage.load((pageobj) => {
							const oldText = pageobj.getPageText();

							const lang = params.translationLanguage;
							const reason = params.translationComments;

							let templateText;

							let text, summary;
							if (params.tags.includes('Rough translation')) {
								templateText = '{{subst:Dual fluency request|pg=' + Morebits.pageNameNorm + '|Language=' +
									(lang || 'uncertain') + '|Comments=' + reason.trim() + '}} ~~~~';
								// Place in section == Translated pages that could still use some cleanup ==
								text = oldText + '\n\n' + templateText;
								summary = 'تم طلب تنظيف الترجمة على ';
							} else if (params.tags.includes('Not English')) {
								templateText = '{{subst:Translation request|pg=' + Morebits.pageNameNorm + '|Language=' +
									(lang || 'uncertain') + '|Comments=' + reason.trim() + '}} ~~~~';
								// Place in section == Pages for consideration ==
								text = oldText.replace(/\n+(==\s?Translated pages that could still use some cleanup\s?==)/,
									'\n\n' + templateText + '\n\n$1');
								summary = 'الترجمة' + (lang ? ' من ' + lang : '') + ' تم طلبها على ';
							}

							if (text === oldText) {
								pageobj.getStatusElement().error('فشل العثور على المكان المستهدف للمناقشة');
								return;
							}
							pageobj.setPageText(text);
							pageobj.setEditSummary(summary + ' [[:' + Morebits.pageNameNorm + ']]');
							pageobj.setChangeTags(Twinkle.changeTags);
							pageobj.setCreateOption('recreate');
							pageobj.save();
						});
					}
					// Notify the user ({{ترجمة غير مكتملة}} only)
					if (params.translationNotify) {
						new Morebits.wiki.Page(Morebits.pageNameNorm).lookupCreation((innerPageobj) => {
							const initialContrib = innerPageobj.getCreator();

							// Disallow warning yourself
							if (initialContrib === mw.config.get('wgUserName')) {
								innerPageobj.getStatusElement().warn('أنت (' + initialContrib + ') أنشأت هذه الصفحة؛ تخطي إشعار المستخدم');
								return;
							}

							const userTalkPage = new Morebits.wiki.Page('User talk:' + initialContrib,
								'إخطار المساهم الأولي (' + initialContrib + ')');
							userTalkPage.setNewSectionTitle('مقالك [[' + Morebits.pageNameNorm + ']]');
							userTalkPage.setNewSectionText('{{subst:uw-notenglish|1=' + Morebits.pageNameNorm +
								(params.translationPostAtPNT ? '' : '|nopnt=yes') + '}} ~~~~');
							userTalkPage.setEditSummary('إشعار: يرجى استخدام اللغة الإنجليزية عند المساهمة في ويكيبيديا الإنجليزية.');
							userTalkPage.setChangeTags(Twinkle.changeTags);
							userTalkPage.setCreateOption('recreate');
							userTalkPage.setFollowRedirect(true, false);
							userTalkPage.newSection();
						});
					}
				});

				if (params.patrol) {
					pageobj.triage();
				}
			};

			/**
			 * Removes the existing tags that were deselected (if any)
			 * Calls postRemoval() when done
			 */
			const removeTags = function removeTags() {

				if (params.tagsToRemove.length === 0) {
					postRemoval();
					return;
				}

				Morebits.Status.info('معلومات', 'إزالة القوالب التي أُلغي تحديدها والتي كانت موجودة بالفعل');

				const getRedirectsFor = [];

				// Remove the tags from the page text, if found in its proper name,
				// otherwise moves it to `getRedirectsFor` array earmarking it for
				// later removal
				params.tagsToRemove.forEach((tag) => {
					const tagRegex = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?');

					if (tagRegex.test(pageText)) {
						pageText = pageText.replace(tagRegex, '');
					} else {
						getRedirectsFor.push('Template:' + tag);
					}
				});

				if (!getRedirectsFor.length) {
					postRemoval();
					return;
				}

				// Remove tags which appear in page text as redirects
				const api = new Morebits.wiki.Api('Getting template redirects', {
					action: 'query',
					prop: 'linkshere',
					titles: getRedirectsFor.join('|'),
					redirects: 1, // follow redirect if the class name turns out to be a redirect page
					lhnamespace: '10', // template namespace only
					lhshow: 'redirect',
					lhlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
					format: 'json'
				}, ((apiobj) => {
					const pages = apiobj.getResponse().query.pages.filter((p) => !p.missing && !!p.linkshere);
					pages.forEach((page) => {
						let removed = false;
						page.linkshere.concat({ title: page.title }).forEach((el) => {
							const tag = el.title.slice(9);
							const tagRegex = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?');
							if (tagRegex.test(pageText)) {
								pageText = pageText.replace(tagRegex, '');
								removed = true;
								return false; // break out of $.each
							}
						});
						if (!removed) {
							Morebits.Status.warn('معلومات', 'فشل العثور على {{' +
								page.title.slice(9) + '}} في الصفحة... باستثناء');
						}

					});

					postRemoval();

				}));
				api.post();

			};

			if (!params.tags.length) {
				removeTags();
				return;
			}

			let tagRe, tagText = '', tags = [];
			const groupableTags = [], groupableExistingTags = [];
			// Executes first: addition of selected tags

			/**
			 * Updates `tagText` with the syntax of `tagName` template with its parameters
			 *
			 * @param {number} tagIndex
			 * @param {string} tagName
			 */
			const addTag = function articleAddTag(tagIndex, tagName) {
				let currentTag = '';
				if (tagName === 'Uncategorized' || tagName === 'Improve categories') {
					pageText += '\n\n{{' + tagName + '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}';
				} else {
					currentTag += '{{' + tagName;
					// fill in other parameters, based on the tag

					const subgroupObj = Twinkle.tag.article.flatObject[tagName] &&
						Twinkle.tag.article.flatObject[tagName].subgroup;
					if (subgroupObj) {
						const subgroups = Array.isArray(subgroupObj) ? subgroupObj : [subgroupObj];
						subgroups.forEach((gr) => {
							if (gr.parameter && (params[gr.name] || gr.required)) {
								currentTag += '|' + gr.parameter + '=' + (params[gr.name] || '');
							}
						});
					}

					switch (tagName) {
						case 'Not English':
						case 'Rough translation':
							if (params.translationPostAtPNT) {
								currentTag += '|listed=yes';
							}
							break;
						case 'Merge':
						case 'Merge to':
						case 'Merge from':
							params.mergeTag = tagName;
							// normalize the merge target for now and later
							params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));

							currentTag += '|' + params.mergeTarget;

							// link to the correct section on the talk page, for article space only
							if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
								if (!params.discussArticle) {
									// discussArticle is the article whose talk page will contain the discussion
									params.discussArticle = tagName === 'Merge to' ? params.mergeTarget : mw.config.get('wgTitle');
									// nonDiscussArticle is the article which won't have the discussion
									params.nonDiscussArticle = tagName === 'Merge to' ? mw.config.get('wgTitle') : params.mergeTarget;
									const direction = '[[' + params.nonDiscussArticle + ']]' + (params.mergeTag === 'Merge' ? ' with ' : ' into ') + '[[' + params.discussArticle + ']]';
									params.talkDiscussionTitleLinked = 'Proposed merge of ' + direction;
									params.talkDiscussionTitle = params.talkDiscussionTitleLinked.replace(/\[\[(.*?)\]\]/g, '$1');
								}
								const titleWithSectionRemoved = params.discussArticle.replace(/^([^#]*)#.*$/, '$1'); // If article name is Test#Section, delete #Section
								currentTag += '|discuss=Talk:' + titleWithSectionRemoved + '#' + params.talkDiscussionTitle;
							}
							break;
						default:
							break;
					}

					currentTag += '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n';
					tagText += currentTag;
				}
			};

			/**
			 * Adds the tags which go outside {{مشكلات متعددة}}, either because
			 * these tags aren't supported in {{مشكلات متعددة}} or because
			 * {{مشكلات متعددة}} is not being added to the page at all
			 */
			const addUngroupedTags = function () {
				$.each(tags, addTag);

				// Insert tag after short description or any hatnotes,
				// as well as deletion/protection-related templates
				const wikipage = new Morebits.wikitext.Page(pageText);
				const templatesAfter = Twinkle.hatnoteRegex +
					// Protection templates
					'pp|pp-.*?|' +
					// CSD
					'db|delete|db-.*?|speedy deletion-.*?|' +
					// PROD
					'(?:proposed deletion|prod blp)\\/dated(?:\\s*\\|(?:concern|user|timestamp|help).*)+|' +
					// not a hatnote, but sometimes under a CSD or AfD
					'salt|proposed deletion endorsed';
				// AfD is special, as the tag includes html comments before and after the actual template
				// trailing whitespace/newline needed since this subst's a newline
				const afdRegex = '(?:<!--.*AfD.*\\n\\{\\{(?:Article for deletion\\/dated|AfDM).*\\}\\}\\n<!--.*(?:\\n<!--.*)?AfD.*(?:\\s*\\n))?';
				pageText = wikipage.insertAfterTemplates(tagText, templatesAfter, null, afdRegex).getText();

				removeTags();
			};

			// Separate tags into groupable ones (`groupableTags`) and non-groupable ones (`tags`)
			params.tags.forEach((tag) => {
				tagRe = new RegExp('\\{\\{' + tag + '(\\||\\}\\})', 'im');
				// regex check for preexistence of tag can be skipped if in canRemove mode
				if (Twinkle.tag.canRemove || !tagRe.exec(pageText)) {
					// condition Twinkle.tag.article.tags[tag] to ensure that its not a custom tag
					// Custom tags are assumed non-groupable, since we don't know whether MI template supports them
					if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
						groupableTags.push(tag);
					} else {
						tags.push(tag);
					}
				} else {
					if (tag === 'Merge from' || tag === 'History merge') {
						tags.push(tag);
					} else {
						Morebits.Status.warn('معلومات', 'عُثر على {{' + tag +
							'}} في المقال بالفعل... باستثناء');
						// don't do anything else with merge tags
						if (['Merge', 'Merge to'].includes(tag)) {
							params.mergeTarget = params.mergeReason = params.mergeTagOther = null;
						}
					}
				}
			});

			// To-be-retained existing tags that are groupable
			params.tagsToRemain.forEach((tag) => {
				// If the tag is unknown to us, we consider it non-groupable
				if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
					groupableExistingTags.push(tag);
				}
			});

			const miTest = /\{\{(multiple ?issues|article ?issues|mi)(?!\s*\|\s*section\s*=)[^}]+\{/im.exec(pageText);

			if (miTest && groupableTags.length > 0) {
				Morebits.Status.info('معلومات', 'إضافة قوالب مدعومة داخل قالب {{قضايا متعددة}} موجود');

				tagText = '';
				$.each(groupableTags, addTag);

				const miRegex = new RegExp('(\\{\\{\\s*' + miTest[1] + '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*', 'im');
				pageText = pageText.replace(miRegex, '$1' + tagText + '}}\n');
				tagText = '';

				addUngroupedTags();

			} else if (params.group && !miTest && (groupableExistingTags.length + groupableTags.length) >= 2) {
				Morebits.Status.info('معلومات', 'تجميع القوالب المدعومة داخل {{قضايا متعددة}}');

				tagText += '{{قضايا متعددة|\n';

				/**
				 * Adds newly added tags to MI
				 */
				const addNewTagsToMI = function () {
					$.each(groupableTags, addTag);
					tagText += '}}\n';

					addUngroupedTags();
				};

				const getRedirectsFor = [];

				// Reposition the tags on the page into {{مشكلات متعددة}}, if found with its
				// proper name, else moves it to `getRedirectsFor` array to be handled later
				groupableExistingTags.forEach((tag) => {
					const tagRegex = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?)');
					if (tagRegex.test(pageText)) {
						tagText += tagRegex.exec(pageText)[1];
						pageText = pageText.replace(tagRegex, '');
					} else {
						getRedirectsFor.push('Template:' + tag);
					}
				});

				if (!getRedirectsFor.length) {
					addNewTagsToMI();
					return;
				}

				const api = new Morebits.wiki.Api('Getting template redirects', {
					action: 'query',
					prop: 'linkshere',
					titles: getRedirectsFor.join('|'),
					redirects: 1,
					lhnamespace: '10', // template namespace only
					lhshow: 'redirect',
					lhlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
					format: 'json'
				}, ((apiobj) => {
					const pages = apiobj.getResponse().query.pages.filter((p) => !p.missing && !!p.linkshere);
					pages.forEach((page) => {
						let found = false;
						page.linkshere.forEach((el) => {
							const tag = el.title.slice(9);
							const tagRegex = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?)');
							if (tagRegex.test(pageText)) {
								tagText += tagRegex.exec(pageText)[1];
								pageText = pageText.replace(tagRegex, '');
								found = true;
								return false; // break out of $.each
							}
						});
						if (!found) {
							Morebits.Status.warn('معلومات', 'فشل العثور على {{' +
								page.title.slice(9) + '}} الموجود في الصفحة... تخطي إعادة تحديد الموضع');
						}
					});
					addNewTagsToMI();
				}));
				api.post();

			} else {
				tags = tags.concat(groupableTags);
				addUngroupedTags();
			}
		},

		redirect: function redirect(pageobj) {
			const params = pageobj.getCallbackParameters(),
				tags = [];
			let pageText = pageobj.getPageText(),
				tagRe, tagText = '',
				summaryText = 'تمت إضافة',
				i;

			for (i = 0; i < params.tags.length; i++) {
				tagRe = new RegExp('(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im');
				if (!tagRe.exec(pageText)) {
					tags.push(params.tags[i]);
				} else {
					Morebits.Status.warn('معلومات', 'عُثر على {{' + params.tags[i] +
						'}} في التحويل بالفعل... باستثناء');
				}
			}

			const addTag = function redirectAddTag(tagIndex, tagName) {
				tagText += '\n{{' + tagName;
				if (tagName === 'R from alternative language') {
					if (params.altLangFrom) {
						tagText += '|from=' + params.altLangFrom;
					}
					if (params.altLangTo) {
						tagText += '|to=' + params.altLangTo;
					}
				} else if (tagName === 'R avoided double redirect' && params.doubleRedirectTarget) {
					tagText += '|1=' + params.doubleRedirectTarget;
				}
				tagText += '}}';

				if (tagIndex > 0) {
					if (tagIndex === (tags.length - 1)) {
						summaryText += ' و';
					} else if (tagIndex < (tags.length - 1)) {
						summaryText += '،';
					}
				}

				summaryText += ' {{[[:' + (tagName.includes(':') ? tagName : 'Template:' + tagName + '|' + tagName) + ']]}}';
			};

			if (!tags.length) {
				Morebits.Status.warn('معلومات', 'لا توجد قوالب متبقية لتطبيقها');
			}

			tags.sort();
			$.each(tags, addTag);

			// Check for all Rcat shell redirects (from #433)
			if (pageText.match(/{{(?:redr|this is a redirect|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
				// Regex inspired by [[User:Kephir/gadgets/sagittarius.js]] ([[Special:PermaLink/831402893]])
				const oldTags = pageText.match(/(\s*{{[A-Za-z\s]+\|(?:\s*1=)?)((?:[^|{}]|{{[^}]+}})+)(}})\s*/i);
				pageText = pageText.replace(oldTags[0], oldTags[1] + tagText + oldTags[2] + oldTags[3]);
			} else {
				// Fold any pre-existing Rcats into taglist and under Rcatshell
				const pageTags = pageText.match(/\s*{{R(?:edirect)? .*?}}/img);
				let oldPageTags = '';
				if (pageTags) {
					pageTags.forEach((pageTag) => {
						const pageRe = new RegExp(Morebits.string.escapeRegExp(pageTag), 'img');
						pageText = pageText.replace(pageRe, '');
						pageTag = pageTag.trim();
						oldPageTags += '\n' + pageTag;
					});
				}
				pageText = pageText.trim() + '\n\n{{غلاف تصنيف تحويل|' + tagText + oldPageTags + '\n}}';
			}

			summaryText += (tags.length > 0 ? ' قالب' + (tags.length > 1 ? 's' : ' ') : ' {{[[قالب:غلاف تصنيف تحويل|Redirect category shell]]}}') + ' إلى التحويل';

			// avoid truncated summaries
			if (summaryText.length > 499) {
				summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
			}

			pageobj.setPageText(pageText);
			pageobj.setEditSummary(summaryText);
			if (Twinkle.getPref('watchTaggedVenues').includes('redirects')) {
				pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
			}
			pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
			pageobj.setCreateOption('nocreate');
			pageobj.save();

			if (params.patrol) {
				pageobj.triage();
			}

		},

		file: function twinkletagCallbacksFile(pageobj) {
			let text = pageobj.getPageText();
			const params = pageobj.getCallbackParameters();
			let summary = 'إضافة ';

			// Add maintenance tags
			if (params.tags.length) {

				let tagtext = '', currentTag;
				$.each(params.tags, (k, tag) => {
					// when other commons-related tags are placed, remove "move to Commons" tag
					if (['Keep local', 'Do not move to Commons'].includes(tag)) {
						text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
					}

					currentTag = tag;

					switch (tag) {
						case 'Keep local':
							if (params.keeplocalName !== '') {
								currentTag += '|1=' + params.keeplocalName;
							}
							break;
						case 'Rename media':
							if (params.renamemediaNewname !== '') {
								currentTag += '|1=' + params.renamemediaNewname;
							}
							if (params.renamemediaReason !== '') {
								currentTag += '|2=' + params.renamemediaReason;
							}
							break;
						case 'Cleanup image':
							currentTag += '|1=' + params.cleanupimageReason;
							break;
						case 'Image-Poor-Quality':
							currentTag += '|1=' + params.ImagePoorQualityReason;
							break;
						case 'Image hoax':
							currentTag += '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}';
							break;
						case 'Low quality chem':
							currentTag += '|1=' + params.lowQualityChemReason;
							break;
						case 'Vector version available':
							text = text.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
						/* falls through */
						case 'PNG version available':
						/* falls through */
						case 'Obsolete':
							currentTag += '|1=' + params[tag.replace(/ /g, '_') + 'File'];
							break;
						case 'Do not move to Commons':
							currentTag += '|reason=' + params.DoNotMoveToCommons_reason;
							if (params.DoNotMoveToCommons_expiry) {
								currentTag += '|expiry=' + params.DoNotMoveToCommons_expiry;
							}
							break;
						case 'Orphaned non-free revisions':
							currentTag = 'subst:' + currentTag; // subst
							// remove {{تصغير حجم ملف غير حر}} and redirects
							text = text.replace(/\{\{\s*(Template\s*:\s*)?(Non-free reduce|FairUseReduce|Fairusereduce|Fair Use Reduce|Fair use reduce|Reduce size|Reduce|Fair-use reduce|Image-toobig|Comic-ovrsize-img|Non-free-reduce|Nfr|Smaller image|Nonfree reduce)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
							currentTag += '|date={{subst:date}}';
							break;
						case 'Copy to Commons':
							currentTag += '|human=' + mw.config.get('wgUserName');
							break;
						case 'Should be SVG':
							currentTag += '|' + params.svgCategory;
							break;
						case 'Nominated for deletion on Commons':
							if (params.nominatedOnCommonsName !== '') {
								currentTag += '|1=' + params.nominatedOnCommonsName;
							}
							break;
						case 'Deleted on Commons':
							if (params.deletedOnCommonsName !== '') {
								currentTag += '|1=' + params.deletedOnCommonsName;
							}
							break;
						default:
							break; // don't care
					}

					currentTag = '{{' + currentTag + '}}\n';

					tagtext += currentTag;
					summary += '{{' + tag + '}}, ';
				});

				if (!tagtext) {
					pageobj.getStatusElement().warn('ألغى المستخدم العملية؛ لا يوجد شيء للقيام به');
					return;
				}

				text = tagtext + text;
			}

			pageobj.setPageText(text);
			pageobj.setEditSummary(summary.substring(0, summary.length - 2));
			pageobj.setChangeTags(Twinkle.changeTags);
			if (Twinkle.getPref('watchTaggedVenues').includes('files')) {
				pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
			}
			pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
			pageobj.setCreateOption('nocreate');
			pageobj.save();

			if (params.patrol) {
				pageobj.triage();
			}
		}
	};

	/**
	 * Given an array of incompatible tags, check if we have two or more selected
	 *
	 * @param {Array} incompatibleTags
	 * @param {Array} tagsToCheck
	 * @param {string} [extraMessage]
	 * @return {true|undefined}
	 */
	Twinkle.tag.checkIncompatible = function (incompatibleTags, tagsToCheck, extraMessage = null) {
		const count = incompatibleTags.filter((tag) => tagsToCheck.includes(tag)).length;
		if (count > 1) {
			const incompatibleTagsString = '{{' + incompatibleTags.join('}}, {{') + '}}';
			let message = 'الرجاء تحديد قالب واحد فقط من: ' + incompatibleTagsString + '.';
			message += extraMessage ? ' ' + extraMessage : '';
			alert(message);
			return true;
		}
	};

	Twinkle.tag.callback.evaluate = function twinkletagCallbackEvaluate(e) {
		const form = e.target;
		const params = Morebits.QuickForm.getInputData(form);

		// Validation

		// We could theoretically put them all checkIncompatible calls in a
		// forEach loop, but it's probably clearer not to have [[array one],
		// [array two]] devoid of context.
		switch (Twinkle.tag.mode) {
			case 'article':
				params.tagsToRemove = form.getUnchecked('existingTags'); // not in `input`
				params.tagsToRemain = params.existingTags || []; // container not created if none present

				if ((params.tags.includes('Merge')) || (params.tags.includes('Merge from')) ||
					(params.tags.includes('Merge to'))) {
					if (Twinkle.tag.checkIncompatible(['Merge', 'Merge from', 'Merge to'], params.tags, 'إذا كانت هناك حاجة إلى عدة عمليات دمج، فاستخدم {{دمج}} وافصل أسماء المقالات بأحرف الأنابيب (على الرغم من أنه في هذه الحالة لا يمكن لـ توينكل وضع علامة على المقالات الأخرى تلقائيًا).')) {
						return;
					}
					if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.includes('|')) {
						alert('وضع علامة على مقالات متعددة في عملية دمج، وبدء مناقشة لمقالات متعددة، غير مدعوم في الوقت الحالي. يرجى إيقاف تشغيل "وضع علامة على مقال آخر"، و/أو مسح مربع "السبب"، والمحاولة مرة أخرى.');
						return;
					}
				}

				if (Twinkle.tag.checkIncompatible(['Not English', 'Rough translation'], params.tags)) {
					return;
				}
				break;

			case 'file':
				if (Twinkle.tag.checkIncompatible(['Bad GIF', 'Bad JPEG', 'Bad SVG', 'Bad format'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible(['Should be PNG', 'Should be SVG', 'Should be text'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible(['Bad SVG', 'Vector version available'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible(['Bad JPEG', 'Overcompressed JPEG'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible(['PNG version available', 'Vector version available'], params.tags)) {
					return;
				}

				// Get extension from either mime-type or title, if not present (e.g., SVGs)
				var extension = ((extension = $('.mime-type').text()) && extension.split(/\//)[1]) || mw.Title.newFromText(Morebits.pageNameNorm).getExtension();
				if (extension) {
					const extensionUpper = extension.toUpperCase();

					// What self-respecting file format has *two* extensions?!
					if (extensionUpper === 'JPG') {
						extension = 'JPEG';
					}

					// Check that selected templates make sense given the file's extension.

					// {{صورة GIF رديئة|JPEG|SVG}}, {{صورة SVG لا تتضمن سوى رسوميات نقطية}}
					if (extensionUpper !== 'GIF' && params.tags.includes('Bad GIF')) {
						alert('يبدو أن هذا ملف ' + extension + '، لذا فإن {{صورة GIF رديئة}} غير مناسب.');
						return;
					} else if (extensionUpper !== 'JPEG' && params.tags.includes('Bad JPEG')) {
						alert('يبدو أن هذا ملف ' + extension + '، لذا فإن {{صورة JPEG رديئة}} غير مناسب.');
						return;
					} else if (extensionUpper !== 'SVG' && params.tags.includes('Bad SVG')) {
						alert('يبدو أن هذا ملف ' + extension + '، لذا فإن {{صورة SVG بعناصر نقطية}} غير مناسب.');
						return;
					} else if (extensionUpper !== 'SVG' && params.tags.includes('Fake SVG')) {
						alert('يبدو أن هذا ملف ' + extension + '، لذا فإن {{صورة SVG لا تتضمن سوى رسوميات نقطية}} غير مناسب.');
						return;
					}

					// {{يجب أن تكون بتنسيق PNG|SVG}}
					if (params.tags.includes('Should be ' + extensionUpper)) {
						alert('هذا بالفعل ملف ' + extension + '، لذا فإن {{Should be ' + extensionUpper + '}} غير مناسب.');
						return;
					}

					// {{صورة ذات ضغط JPEG مفرط}}
					if (params.tags.includes('Overcompressed JPEG') && extensionUpper !== 'JPEG') {
						alert('يبدو أن هذا ملف ' + extension + '، لذا من المحتمل ألا ينطبق {{صورة ذات ضغط JPEG مفرط}}.');
						return;
					}

					// {{رسم رديء}} and {{خط رديئ}}
					if (extensionUpper !== 'SVG') {
						if (params.tags.includes('Bad trace')) {
							alert('يبدو أن هذا ملف ' + extension + '، لذا من المحتمل ألا ينطبق {{رسم رديء}}.');
							return;
						} else if (params.tags.includes('Bad font')) {
							alert('يبدو أن هذا ملف ' + extension + '، لذا من المحتمل ألا ينطبق {{خط رديئ}}.');
							return;
						}
					}
				}

				// {{لا تصدر لكومنز}}
				if (
					params.tags.includes('Do not move to Commons') &&
					params.DoNotMoveToCommons_expiry &&
					(
						!/^2\d{3}$/.test(params.DoNotMoveToCommons_expiry) ||
						parseInt(params.DoNotMoveToCommons_expiry, 10) <= new Date().getFullYear()
					)
				) {
					alert('يجب أن تكون سنة مستقبلية صالحة.');
					return;
				}

				break;

			case 'redirect':
				if (Twinkle.tag.checkIncompatible(['R printworthy', 'R unprintworthy'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible(['R from subtopic', 'R to subtopic'], params.tags)) {
					return;
				}
				if (Twinkle.tag.checkIncompatible([
					'R to category namespace',
					'R to help namespace',
					'R to main namespace',
					'R to portal namespace',
					'R to project namespace',
					'R to user namespace'
				], params.tags)) {
					return;
				}
				break;

			default:
				alert('Twinkle.tag: unknown mode ' + Twinkle.tag.mode);
				break;
		}

		// File/redirect: return if no tags selected
		// Article: return if no tag is selected and no already present tag is deselected
		if (params.tags.length === 0 && (Twinkle.tag.mode !== 'article' || params.tagsToRemove.length === 0)) {
			alert('يجب عليك تحديد قالب واحد على الأقل!');
			return;
		}

		Morebits.SimpleWindow.setButtonsEnabled(false);
		Morebits.Status.init(form);

		Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
		Morebits.wiki.actionCompleted.notice = 'اكتمل وضع العلامات، إعادة تحميل المقال في غضون ثوان قليلة';
		if (Twinkle.tag.mode === 'redirect') {
			Morebits.wiki.actionCompleted.followRedirect = false;
		}

		const wikipediaPage = new Morebits.wiki.Page(Morebits.pageNameNorm, 'وضع علامات ' + Twinkle.tag.mode);
		wikipediaPage.setCallbackParameters(params);
		wikipediaPage.setChangeTags(Twinkle.changeTags); // Here to apply to triage
		wikipediaPage.load(Twinkle.tag.callbacks[Twinkle.tag.mode]);

	};


	Twinkle.addInitCallback(Twinkle.tag, 'tag');
}());
// </nowiki>
