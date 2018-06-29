/* cgit.css: javacript functions for cgit
 *
 * Copyright (C) 2006-2018 cgit Development Team <cgit@lists.zx2c4.com>
 *
 * Licensed under GNU General Public License v2
 *   (see COPYING for full license text)
 */

(function () {

var burger, menu_popup;

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

function parse_hashurl_start(h)
{
	return parseInt(h.substring(2));
}

function parse_hashurl_end(h, start)
{
	var t = h.indexOf("-"), e = start;

	if (t >= 1)
		e = parseInt(h.substring(t + 1));

	if (e < start)
		e = start;

	return e;
}


/*
 * This creates an absolute div as a child of the content table.
 * It's horizontally and vertically aligned and sized according
 * to the #URL information like #n123-456
 * 
 * If the highlight div already exists, it's removed and remade.
 */

function line_range_highlight(do_burger)
{
	var h = window.location.hash, l1 = 0, l2 = 0, e, t;

	e = document.getElementById("cgit-line-range");
	if (e) {
		l1 = e.l1;
		while (l1 <= e.l2) {
			var e1;
			e1 = document.getElementById('n' + l1++);
				e1.classList.remove(
					'selected-line-link-highlight');
		}

		e.remove();
	}

	l1 = parse_hashurl_start(h);
	if (!l1)
		return;

	l2 = parse_hashurl_end(h, l1);

	var lh, etable, etr, de, n, hl, v;

	e = document.getElementById('n' + l1);
	if (!e)
		return;

	if (do_burger)
		burger_create(e);

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

	/* the table is offset from the left, the highlight needs to follow it */
	etable = find_parent_of_type(etr, "table");
	de.style.left = etable.offsetLeft + 'px';
	de.style.height = ((l2 - l1 + 1) * e.offsetHeight) + 'px';

	etr.insertBefore(de, etr.firstChild);

	setTimeout(function() {
		de.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
	}, 1);

	n = l1;
	while (n <= l2)
		document.getElementById('n' + n++).classList.add(
					'selected-line-link-highlight');

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

function copy_clipboard(value)
{
	var inp = document.createElement("textarea");
	var e = document.getElementById("linenumbers");

	inp.type = "text";
	inp.value = value;
	/* hidden style stops it working for clipboard */
	inp.setAttribute('readonly', '');
	inp.style.position = "absolute";
	inp.style.left = "-1000px";

	e.appendChild(inp);

	inp.select();

	document.execCommand("copy");

	inp.remove();
}

/* we want to copy plain text for a line range */

function copy_text(elem, l1, l2)
{
	var tc = elem.textContent.split('\n'), s = "";

	l1 --;

	while (l1 < l2)
		s += tc[l1++] + '\n';

	copy_clipboard(s);
}


/*
 * An element in the popup menu was clicked, perform the appropriate action
 */
function mi_click(e) {
	var u, n, l1, l2, el;

	e.stopPropagation();
	e.preventDefault();

	switch (e.target.id) {
	case "mi-c-line":
		l1 = parse_hashurl_start(window.location.hash);
		l2 = parse_hashurl_end(window.location.hash, l1);
		el = document.getElementsByClassName("highlight")[0].firstChild;
		copy_text(el, l1, l2);
		break;
	case "mi-c-link":
		copy_clipboard(window.location.href);
		break;
	case "mi-c-blame":
		u = window.location.href;
		t = u.indexOf("/tree/");
		if (t)
			window.location = u.substring(0, t) + "/blame/" +
				u.substring(t + 6);
		break;
	case "mi-c-tree":
		u = window.location.href;
		t = u.indexOf("/blame/");
		if (t)
			window.location = u.substring(0, t) + "/tree/" +
				u.substring(t + 7);
		break;
	}

	if (!menu_popup)
		return;

	menu_popup.remove();
	menu_popup = null;
}

/* We got a click on the (***) burger menu */

function burger_click(e) {
	var e1 = e, etable, d = new Date, s = "", n, is_blame,
	    ar = new Array("mi-c-line", "mi-c-link", "mi-c-blame", "mi-c-tree"),
	    an = new Array("Copy Lines", "Copy Link",
			   "View Blame", /* 2: shown in /tree/ */
			   "Remove Blame" /* 3: shown in /blame/ */);

	e.preventDefault();

	if (menu_popup) {
		menu_popup.remove();
		menu_popup = null;

		return;
	}

	/*
	 * Create the popup menu
	 */

	is_blame = !!document.getElementsByClassName("hashes").length;

	menu_popup = document.createElement("DIV");
	menu_popup.className = "popup-menu";
	menu_popup.style.top = collect_offsetTop(e1) + e.offsetHeight + "px";

	s = "<ul id='menu-ul'>";
	for (n = 0; n < an.length; n++)
		if (n < 2 || is_blame == (n == 3))
			s += "<li id='" + ar[n] + "' tabindex='" + n + "'>" +
				an[n] + "</li>";
		    
	menu_popup.innerHTML = s;

	burger.insertBefore(menu_popup, null);

        document.getElementById(ar[0]).focus();
	for (n = 0; n < an.length; n++)
		if (n < 2 || is_blame == (n == 3))
			document.getElementById(ar[n]).
				addEventListener("click", mi_click);
				
	setTimeout(function() {
		menu_popup.style.opacity = "1";
	}, 1);

	/* detect loss of focus for popup menu */
	menu_popup.addEventListener("focusout", function(e) {
		/* if focus went to a child (menu item), ignore */
		if (e.relatedTarget &&
		    e.relatedTarget.parentNode.id == "menu-ul")
			return;

		menu_popup.remove();
		menu_popup = null;
	});
}

function burger_create(e)
{
	var e1 = e, etable, d = new Date;

	if (burger)
		burger.remove();

	burger = document.createElement("DIV");
	burger.className = "selected-lines-popup";
	burger.style.top = collect_offsetTop(e1) + "px";

	/* event listener cannot override default browser #URL behaviour */
	burger.onclick = burger_click;

	etable = find_parent_of_type(e, "table");
	etable.insertBefore(burger, etable.firstChild);
	burger_time = d.getTime();

	setTimeout(function() {
		burger.style.opacity = "1";
	}, 1);
}

/*
 * We got a click on a line number #url
 *
 * Create the "burger" menu there.
 *
 * Redraw the line range highlight accordingly.
 */

function line_range_click(e) {
	var t, elem, m, n = window.location.href.length -
			    window.location.hash.length;

	/* disable passthru to stop scrolling by browser #URL handler */
	e.stopPropagation();
	e.preventDefault();

	if (!e.target.id)
		return;

	if (menu_popup) {
		menu_popup.remove();
		menu_popup = null;

		return;
	}

	elem = document.getElementById(e.target.id);
	if (!elem)
		return;

	burger_create(elem);

	if (!window.location.hash ||
	    window.location.hash.indexOf("-") >= 0 ||
	    e.target.id.substring(1) == window.location.href.substring(n + 2))
		t = window.location.href.substring(0, n) +
		    '#n' + e.target.id.substring(1);
	else {
		if (parseInt(window.location.hash.substring(2)) <
		    parseInt(e.target.id.substring(1)))  /* forwards */
			t = window.location + '-' + e.target.id.substring(1);
		else
			t = window.location.href.substring(0, n) +
				'#n' + e.target.id.substring(1) + '-' +
				window.location.href.substring(n + 2);
	}

	window.history.replaceState(null, null, t);

	line_range_highlight(0);
}

/* we have to use load, because header images can push the layout vertically */
window.addEventListener("load", function() {
	line_range_highlight(1);
}, false);

document.addEventListener("DOMContentLoaded", function() {
	/* event listener cannot override default #URL browser processing,
	 * requires onclick */
	var e = document.getElementById("linenumbers");
	if (e)
		e.onclick = line_range_click;
}, false);

window.addEventListener("hashchange", function() {
	line_range_highlight(1);
}, false);

})();
