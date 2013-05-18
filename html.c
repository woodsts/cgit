/* html.c: helper functions for html output
 *
 * Copyright (C) 2006 Lars Hjemli
 *
 * Licensed under GNU General Public License v2
 *   (see COPYING for full license text)
 */

#include "cgit.h"
#include "html.h"
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <errno.h>

/* Percent-encoding of each character, except: a-zA-Z0-9!$()*,./:;@- */
static const char* url_escape_table[256] = {
	"%00", "%01", "%02", "%03", "%04", "%05", "%06", "%07", "%08", "%09",
	"%0a", "%0b", "%0c", "%0d", "%0e", "%0f", "%10", "%11", "%12", "%13",
	"%14", "%15", "%16", "%17", "%18", "%19", "%1a", "%1b", "%1c", "%1d",
	"%1e", "%1f", "%20", 0, "%22", "%23", 0, "%25", "%26", "%27", 0, 0, 0,
	"%2b", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "%3c", "%3d",
	"%3e", "%3f", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, "%5c", 0, "%5e", 0, "%60", 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "%7b",
	"%7c", "%7d", 0, "%7f", "%80", "%81", "%82", "%83", "%84", "%85",
	"%86", "%87", "%88", "%89", "%8a", "%8b", "%8c", "%8d", "%8e", "%8f",
	"%90", "%91", "%92", "%93", "%94", "%95", "%96", "%97", "%98", "%99",
	"%9a", "%9b", "%9c", "%9d", "%9e", "%9f", "%a0", "%a1", "%a2", "%a3",
	"%a4", "%a5", "%a6", "%a7", "%a8", "%a9", "%aa", "%ab", "%ac", "%ad",
	"%ae", "%af", "%b0", "%b1", "%b2", "%b3", "%b4", "%b5", "%b6", "%b7",
	"%b8", "%b9", "%ba", "%bb", "%bc", "%bd", "%be", "%bf", "%c0", "%c1",
	"%c2", "%c3", "%c4", "%c5", "%c6", "%c7", "%c8", "%c9", "%ca", "%cb",
	"%cc", "%cd", "%ce", "%cf", "%d0", "%d1", "%d2", "%d3", "%d4", "%d5",
	"%d6", "%d7", "%d8", "%d9", "%da", "%db", "%dc", "%dd", "%de", "%df",
	"%e0", "%e1", "%e2", "%e3", "%e4", "%e5", "%e6", "%e7", "%e8", "%e9",
	"%ea", "%eb", "%ec", "%ed", "%ee", "%ef", "%f0", "%f1", "%f2", "%f3",
	"%f4", "%f5", "%f6", "%f7", "%f8", "%f9", "%fa", "%fb", "%fc", "%fd",
	"%fe", "%ff"
};

static int htmlfd = STDOUT_FILENO;

char *fmt(const char *format, ...)
{
	static char buf[8][1024];
	static int bufidx;
	int len;
	va_list args;

	bufidx++;
	bufidx &= 7;

	va_start(args, format);
	len = vsnprintf(buf[bufidx], sizeof(buf[bufidx]), format, args);
	va_end(args);
	if (len > sizeof(buf[bufidx])) {
		fprintf(stderr, "[html.c] string truncated: %s\n", format);
		exit(1);
	}
	return buf[bufidx];
}

char *fmtalloc(const char *format, ...)
{
	struct strbuf sb = STRBUF_INIT;
	va_list args;

	va_start(args, format);
	strbuf_vaddf(&sb, format, args);
	va_end(args);

	return strbuf_detach(&sb, NULL);
}

void html_raw(const char *data, size_t size)
{
	if (write(htmlfd, data, size) != size)
		die_errno("write error on html output");
}

void html(const char *txt)
{
	html_raw(txt, strlen(txt));
}

void htmlf(const char *format, ...)
{
	va_list args;
	struct strbuf buf = STRBUF_INIT;

	va_start(args, format);
	strbuf_vaddf(&buf, format, args);
	va_end(args);
	html(buf.buf);
	strbuf_release(&buf);
}

void html_txtf(const char *format, ...)
{
	va_list args;

	va_start(args, format);
	html_vtxtf(format, args);
	va_end(args);
}

void html_vtxtf(const char *format, va_list ap)
{
	va_list cp;
	struct strbuf buf = STRBUF_INIT;

	va_copy(cp, ap);
	strbuf_vaddf(&buf, format, cp);
	va_end(cp);
	html_txt(buf.buf);
	strbuf_release(&buf);
}

void html_status(int code, const char *msg, int more_headers)
{
	htmlf("Status: %d %s\n", code, msg);
	if (!more_headers)
		html("\n");
}

void html_txt(const char *txt)
{
	const char *t = txt;
	while (t && *t) {
		int c = *t;
		if (c == '<' || c == '>' || c == '&') {
			html_raw(txt, t - txt);
			if (c == '>')
				html("&gt;");
			else if (c == '<')
				html("&lt;");
			else if (c == '&')
				html("&amp;");
			txt = t + 1;
		}
		t++;
	}
	if (t != txt)
		html(txt);
}

void html_ntxt(int len, const char *txt)
{
	const char *t = txt;
	while (t && *t && len--) {
		int c = *t;
		if (c == '<' || c == '>' || c == '&') {
			html_raw(txt, t - txt);
			if (c == '>')
				html("&gt;");
			else if (c == '<')
				html("&lt;");
			else if (c == '&')
				html("&amp;");
			txt = t + 1;
		}
		t++;
	}
	if (t != txt)
		html_raw(txt, t - txt);
	if (len < 0)
		html("...");
}

void html_attrf(const char *fmt, ...)
{
	va_list ap;
	struct strbuf sb = STRBUF_INIT;

	va_start(ap, fmt);
	strbuf_vaddf(&sb, fmt, ap);
	va_end(ap);

	html_attr(sb.buf);
	strbuf_release(&sb);
}

void html_attr(const char *txt)
{
	const char *t = txt;
	while (t && *t) {
		int c = *t;
		if (c == '<' || c == '>' || c == '\'' || c == '\"' || c == '&') {
			html_raw(txt, t - txt);
			if (c == '>')
				html("&gt;");
			else if (c == '<')
				html("&lt;");
			else if (c == '\'')
				html("&#x27;");
			else if (c == '"')
				html("&quot;");
			else if (c == '&')
				html("&amp;");
			txt = t + 1;
		}
		t++;
	}
	if (t != txt)
		html(txt);
}

void html_url_path(const char *txt)
{
	const char *t = txt;
	while (t && *t) {
		unsigned char c = *t;
		const char *e = url_escape_table[c];
		if (e && c != '+' && c != '&') {
			html_raw(txt, t - txt);
			html(e);
			txt = t + 1;
		}
		t++;
	}
	if (t != txt)
		html(txt);
}

void html_url_arg(const char *txt)
{
	const char *t = txt;
	while (t && *t) {
		unsigned char c = *t;
		const char *e = url_escape_table[c];
		if (c == ' ')
			e = "+";
		if (e) {
			html_raw(txt, t - txt);
			html(e);
			txt = t + 1;
		}
		t++;
	}
	if (t != txt)
		html(txt);
}

void html_hidden(const char *name, const char *value)
{
	html("<input type='hidden' name='");
	html_attr(name);
	html("' value='");
	html_attr(value);
	html("'/>");
}

void html_option(const char *value, const char *text, const char *selected_value)
{
	html("<option value='");
	html_attr(value);
	html("'");
	if (selected_value && !strcmp(selected_value, value))
		html(" selected='selected'");
	html(">");
	html_txt(text);
	html("</option>\n");
}

void html_intoption(int value, const char *text, int selected_value)
{
	htmlf("<option value='%d'%s>", value,
	      value == selected_value ? " selected='selected'" : "");
	html_txt(text);
	html("</option>");
}

void html_link_open(const char *url, const char *title, const char *class)
{
	html("<a href='");
	html_attr(url);
	if (title) {
		html("' title='");
		html_attr(title);
	}
	if (class) {
		html("' class='");
		html_attr(class);
	}
	html("'>");
}

void html_link_close(void)
{
	html("</a>");
}

void html_fileperm(unsigned short mode)
{
	htmlf("%c%c%c", (mode & 4 ? 'r' : '-'),
	      (mode & 2 ? 'w' : '-'), (mode & 1 ? 'x' : '-'));
}

int html_include(const char *filename)
{
	FILE *f;
	char buf[4096];
	size_t len;

	if (!(f = fopen(filename, "r"))) {
		fprintf(stderr, "[cgit] Failed to include file %s: %s (%d).\n",
			filename, strerror(errno), errno);
		return -1;
	}
	while ((len = fread(buf, 1, 4096, f)) > 0)
		html_raw(buf, len);
	fclose(f);
	return 0;
}

static int hextoint(char c)
{
	if (c >= 'a' && c <= 'f')
		return 10 + c - 'a';
	else if (c >= 'A' && c <= 'F')
		return 10 + c - 'A';
	else if (c >= '0' && c <= '9')
		return c - '0';
	else
		return -1;
}

static char *convert_query_hexchar(char *txt)
{
	int d1, d2, n;
	n = strlen(txt);
	if (n < 3) {
		*txt = '\0';
		return txt-1;
	}
	d1 = hextoint(*(txt + 1));
	d2 = hextoint(*(txt + 2));
	if (d1 < 0 || d2 < 0) {
		memmove(txt, txt + 3, n - 2);
		return txt-1;
	} else {
		*txt = d1 * 16 + d2;
		memmove(txt + 1, txt + 3, n - 2);
		return txt;
	}
}

int http_parse_querystring(const char *txt_, void (*fn)(const char *name, const char *value))
{
	char *o, *t, *txt, *value = NULL, c;

	if (!txt_)
		return 0;

	o = t = txt = xstrdup(txt_);
	while ((c=*t) != '\0') {
		if (c == '=') {
			*t = '\0';
			value = t + 1;
		} else if (c == '+') {
			*t = ' ';
		} else if (c == '%') {
			t = convert_query_hexchar(t);
		} else if (c == '&') {
			*t = '\0';
			(*fn)(txt, value);
			txt = t + 1;
			value = NULL;
		}
		t++;
	}
	if (t != txt)
		(*fn)(txt, value);
	free(o);
	return 0;
}
