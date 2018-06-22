/* cgit.css: javacript functions for cgit
 *
 * Copyright (C) 2006-2018 cgit Development Team <cgit@lists.zx2c4.com>
 *
 * Licensed under GNU General Public License v2
 *   (see COPYING for full license text)
 */

(function () {

function collect_offsetTop(e1)
{
	var t = 0;

	while (e1) {
		if (e1.offsetTop)
			t += e1.offsetTop;
		e1 = e1.offsetParent;
	}

	return t;
}

function find_parent_of_type(e, type)
{
	while (e.tagName.toLowerCase() != type)
		e = e.parentNode;

	return e;
}

function line_range_highlight()
{
	var h = window.location.hash, l1 = 0, l2 = 0, e, t;

	e = document.getElementById("cgit-line-range");
	if (e) {
		l1 = e.l1;
		while (l1 <= e.l2) {
			var e1;
			e1 = document.getElementById('n' + l1++);
			e1.style.backgroundColor = null;
		}

		e.remove();
	}

	l1 = parseInt(h.substring(2));
	if (!l1)
		return;

	t = h.indexOf("-");
	l2 = l1;
	if (t >= 1)
		l2 = parseInt(h.substring(t + 1));

	if (l2 < l1)
		l2 = l1;

	var lh, etable, etr, de, n, hl, v;

	e = document.getElementById('n' + l1);
	if (!e)
		return;

	de = document.createElement("DIV");

	de.className = "selected-lines";
	de.style.bottom = e.style.bottom;
	de.style.top = collect_offsetTop(e) + 'px';
	de.id = "cgit-line-range";
	de.l1 = l1;
	de.l2 = l2;

	/* we will tack the highlight div at the parent tr */
	etr = find_parent_of_type(e, "tr");

	de.style.width = etr.offsetWidth + 'px';

	/* the table is offset from the left, the highlight
	 * needs to follow it */
	etable = find_parent_of_type(etr, "table");

	de.style.left = etable.offsetLeft + 'px';
	de.style.height = ((l2 - l1 + 1) * e.offsetHeight) + 'px';

	etr.insertBefore(de, etr.firstChild);

	setTimeout(function() {
		de.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
	}, 1);

	n = l1;
	while (n <= l2)
		document.getElementById('n' + n++).style.backgroundColor = "yellow";

	hl = (window.innerHeight / (e.offsetHeight + 1));
	v = (l1 + ((l2 - l1) / 2)) - (hl / 2);
	if (v > l1)
		v = l1;
	if (v < 1)
		v = 1;

	t = document.getElementById('n' + Math.round(v));
	if (!t)
		t = e;

	t.scrollIntoView(true);
}

/* we have to use load, because header images can push the layout vertically */
window.addEventListener("load", function() {
	line_range_highlight();
}, false);

window.addEventListener("hashchange", function() {
	line_range_highlight();
}, false);

})();
