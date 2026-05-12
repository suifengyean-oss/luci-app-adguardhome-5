'use strict';
'require view';
'require form';
'require fs';
'require uci';
'require ui';

function readUci(opt, def) {
	var v = uci.get('AdGuardHome', 'AdGuardHome', opt);
	return (v == null || v === '') ? def : v;
}

function shell(cmd) {
	return fs.exec('/bin/sh', [ '-c', cmd ]);
}

function resolvServers() {
	return L.resolveDefault(fs.read('/tmp/resolv.conf.d/resolv.conf.auto'), null).then(function(data) {
		if (data == null)
			return L.resolveDefault(fs.read('/tmp/resolv.conf.auto'), '');
		return data;
	}).then(function(data) {
		var out = [];
		(data || '').split(/\n/).forEach(function(line) {
			var m = line.match(/^[^#]*nameserver\s+([^\s]+)/);
			if (m)
				out.push('  - ' + m[1]);
		});
		return out.join('\n') + (out.length ? '\n' : '');
	});
}

function templateConfig() {
	return Promise.all([
		resolvServers(),
		L.resolveDefault(fs.read('/usr/share/AdGuardHome/AdGuardHome_template.yaml'), '')
	]).then(function(res) {
		return res[1].split(/\n/).map(function(line) {
			return (line === '#bootstrap_dns' || line === '#upstream_dns') ? res[0].replace(/\n$/, '') : line;
		}).join('\n');
	});
}

function initCodeMirror() {
	if (typeof CodeMirror === 'undefined')
		return;

	var textarea = document.getElementById('widget.cbid.AdGuardHome.AdGuardHome.escconf') ||
		document.querySelector('textarea[name="cbid.AdGuardHome.AdGuardHome.escconf"]');

	if (!textarea || textarea._cm)
		return;

	textarea._cm = CodeMirror.fromTextArea(textarea, {
		mode: 'text/yaml',
		styleActiveLine: true,
		lineNumbers: true,
		theme: 'dracula',
		lineWrapping: true,
		foldGutter: true,
		gutters: [ 'CodeMirror-linenumbers', 'CodeMirror-foldgutter' ],
		matchBrackets: true
	});
	textarea._cm.setSize('100%', '70vh');
	window.addEventListener('resize', function() { textarea._cm.refresh(); });
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('AdGuardHome'),
			L.resolveDefault(fs.read('/tmp/AdGuardHometmpconfig.yaml'), null),
			L.resolveDefault(fs.read('/tmp/AdGuardHometest.log'), '')
		]);
	},

	render: function(data) {
		var configpath = readUci('configpath', '/etc/AdGuardHome.yaml');
		var binpath = readUci('binpath', '/usr/bin/AdGuardHome');
		var tmpExists = data[1] != null;
		var testLog = data[2] || '';
		var m, s, o;

		m = new form.Map('AdGuardHome');
		s = m.section(form.TypedSection, 'AdGuardHome');
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.TextValue, 'escconf');
		o.rows = 66;
		o.wrap = 'off';
		o.rmempty = true;
		o.cfgvalue = function() {
			return L.resolveDefault(fs.read('/tmp/AdGuardHometmpconfig.yaml'), null).then(function(tmp) {
				if (tmp != null)
					return tmp;
				return L.resolveDefault(fs.read(configpath), null).then(function(conf) {
					return conf != null ? conf : templateConfig();
				});
			});
		};
		o.validate = function(section_id, value) {
			value = (value || '').replace(/\r\n/g, '\n');
			return fs.write('/tmp/AdGuardHometmpconfig.yaml', value).then(function() {
				return L.resolveDefault(fs.stat(binpath), null).then(function(st) {
					if (!st)
						return true;
					return shell('%s -c /tmp/AdGuardHometmpconfig.yaml --check-config 2> /tmp/AdGuardHometest.log'.format(binpath)).then(function(res) {
						return res.code === 0 ? true : _('Config check failed. See log below.');
					});
				});
			});
		};
		o.write = function() {
			return L.resolveDefault(fs.read('/tmp/AdGuardHometmpconfig.yaml'), '').then(function(value) {
				return fs.write(configpath, value.replace(/\r\n/g, '\n')).then(function() {
					return L.resolveDefault(fs.remove('/tmp/AdGuardHometmpconfig.yaml'), null);
				});
			});
		};
		o.remove = function() { return fs.write(configpath, ''); };

		o = s.option(form.DummyValue, '_tools');
		o.rawhtml = true;
		o.cfgvalue = function() { return ''; };
		o.renderWidget = function() {
			var nodes = [
				E('link', { rel: 'stylesheet', href: L.resource('codemirror/lib/codemirror.css') }),
				E('link', { rel: 'stylesheet', href: L.resource('codemirror/theme/dracula.css') }),
				E('link', { rel: 'stylesheet', href: L.resource('codemirror/addon/fold/foldgutter.css') }),
				E('script', { src: L.resource('codemirror/lib/codemirror.js'), load: initCodeMirror }),
				E('script', { src: L.resource('codemirror/mode/yaml/yaml.js'), load: initCodeMirror }),
				E('script', { src: L.resource('codemirror/addon/fold/foldcode.js'), load: initCodeMirror }),
				E('script', { src: L.resource('codemirror/addon/fold/foldgutter.js'), load: initCodeMirror }),
				E('script', { src: L.resource('codemirror/addon/fold/indent-fold.js'), load: initCodeMirror })
			];

			if (tmpExists)
				nodes.push(E('button', { 'class': 'btn cbi-button', click: function(ev) {
					ev.preventDefault();
					return L.resolveDefault(fs.remove('/tmp/AdGuardHometmpconfig.yaml'), null).then(function() { location.reload(); });
				} }, _('Reload Config')), ' ');

			nodes.push(E('button', { 'class': 'btn cbi-button', click: function(ev) {
				ev.preventDefault();
				return templateConfig().then(function(text) {
					var textarea = document.getElementById('widget.cbid.AdGuardHome.AdGuardHome.escconf') || document.querySelector('textarea[name="cbid.AdGuardHome.AdGuardHome.escconf"]');
					if (textarea && textarea._cm)
						textarea._cm.setValue(text);
					else if (textarea)
						textarea.value = text;
				});
			} }, _('Use template')));

			window.setTimeout(initCodeMirror, 500);
			return E('div', {}, nodes);
		};
		o.load = function() {
			return L.resolveDefault(fs.stat(binpath), null).then(function(st) {
				if (!st)
					this.description = _('WARNING!!! no bin found apply config will not be test');
			}.bind(this));
		};

		if (tmpExists && testLog !== '') {
			o = s.option(form.TextValue, '_testlog');
			o.readonly = true;
			o.rows = 5;
			o.rmempty = true;
			o.cfgvalue = function() { return testLog; };
		}

		return m.render();
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(function() {
			ui.changes.apply(mode === '0');
			return shell('/etc/init.d/AdGuardHome reload >/dev/null 2>&1 &');
		});
	}
});
