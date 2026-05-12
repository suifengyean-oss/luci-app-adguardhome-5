'use strict';
'require view';
'require form';
'require fs';
'require poll';
'require uci';
'require ui';

function readUci(opt, def) {
	var v = uci.get('AdGuardHome', 'AdGuardHome', opt);
	return (v == null || v === '') ? def : v;
}

function exists(path) {
	return L.resolveDefault(fs.stat(path), null).then(function(st) { return st != null; });
}

function shell(cmd) {
	return fs.exec('/bin/sh', [ '-c', cmd ]);
}

function stripSlash(value) {
	if (value != null && value.length > 1 && value.charAt(value.length - 1) === '/')
		return value.substring(0, value.length - 1);
	return value;
}

function addMessage(map, msg) {
	map.message = map.message ? map.message + '\n' + msg : msg;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('AdGuardHome'),
			L.resolveDefault(fs.read('/var/run/update_core'), null),
			L.resolveDefault(fs.read('/var/run/update_core_error'), null)
		]);
	},

	renderStatus: function(httpport) {
		var status = E('p', { id: 'AdGuardHome_status' }, [ E('em', {}, _('Collecting data...')) ]);

		poll.add(function() {
			var binpath = readUci('binpath', '/usr/bin/AdGuardHome');

			return Promise.all([
				L.resolveDefault(shell('pgrep ' + binpath + ' >/dev/null'), { code: 1 }),
				L.resolveDefault(fs.read('/var/run/AdGredir'), '')
			]).then(function(res) {
				var running = res[0].code === 0;
				var redirected = res[1] === '1';
				var url = window.location.protocol.toLowerCase() + '//' + window.location.hostname + ':' + httpport;

				if (running) {
					status.innerHTML = '<em><b style="color:green">AdGuardHome %s</b></em>'.format(_('RUNNING'));
					status.appendChild(E('em', {}, [ ' ', E('b', { style: 'color:green' }, redirected ? _('Redirected') : _('Not redirect')), ' ' ]));
					status.appendChild(E('button', {
						'class': 'cbi-button cbi-button-reload',
						'click': function() { window.open(url); }
					}, _('Open Web Interface')));
				}
				else {
					status.innerHTML = '<em><b style="color:red">AdGuardHome %s</b></em>'.format(_('NOT RUNNING'));
					status.appendChild(E('em', {}, [ E('b', { style: 'color:red' }, _('Not redirect')) ]));
				}
			});
		});

		return E('fieldset', { 'class': 'cbi-section' }, [ status ]);
	},

	renderUpgradeWidget: function(section_id) {
		var self = this;
		var runningUpdate = this.runningUpdate;
		var hadUpdateError = this.hadUpdateError;
		var updateBtn, forceBtn, logBox, reverseBox;
		var reverse = false;

		function appendLog(txt) {
			if (!txt || !logBox)
				return;

			if (txt === '\0') {
				poll.remove(pollCheck);
				updateBtn.disabled = false;
				updateBtn.value = _('Updated');
				return;
			}

			logBox.value = reverse ? txt.split('\n').reverse().join('\n') + logBox.value : logBox.value + txt;
		}

		function pollCheck() {
			return L.resolveDefault(fs.read('/var/run/lucilogpos'), '0').then(function(pos) {
				pos = parseInt(pos, 10) || 0;
				return L.resolveDefault(fs.read('/tmp/AdGuardHome_update.log'), '').then(function(log) {
					var chunk = log.substring(pos);
					return fs.write('/var/run/lucilogpos', String(log.length)).then(function() {
						return exists('/var/run/update_core').then(function(isRunning) {
							appendLog(isRunning ? chunk : chunk + '\0');
						});
					});
				});
			});
		}

		function startUpdate(force) {
			return fs.write('/var/run/lucilogpos', '0').then(function() {
				var cmd = (force ? 'kill $(pgrep /usr/share/AdGuardHome/update_core.sh); ' : '') +
					'sh /usr/share/AdGuardHome/update_core.sh ' + (force ? 'force ' : '') + '>/tmp/AdGuardHome_update.log 2>&1 &';
				return shell(cmd);
			}).then(function() {
				updateBtn.disabled = true;
				updateBtn.value = _('Check...');
				forceBtn.style.display = '';
				self.logContainer.style.display = '';
				poll.add(pollCheck, 3);
			});
		}

		updateBtn = E('input', {
			'type': 'button',
			'class': 'btn cbi-button cbi-button-apply',
			'value': _('Update core version'),
			'click': function() { return startUpdate(false); }
		});

		forceBtn = E('input', {
			'type': 'button',
			'class': 'btn cbi-button cbi-button-apply',
			'value': _('Force update'),
			'style': 'display:none',
			'click': function() { return startUpdate(true); }
		});

		logBox = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;display:block', 'rows': 5, 'readonly': 'readonly' });
		reverseBox = E('input', { type: 'checkbox', click: function() { reverse = !reverse; logBox.value = logBox.value.split('\n').reverse().join('\n'); } });
		this.logContainer = E('div', { style: 'display:none' }, [ reverseBox, _('reverse'), logBox ]);

		if (runningUpdate || hadUpdateError) {
			window.setTimeout(function() {
				updateBtn.disabled = runningUpdate;
				if (runningUpdate)
					updateBtn.value = _('Check...');
				forceBtn.style.display = runningUpdate ? '' : 'none';
				self.logContainer.style.display = '';
				poll.add(pollCheck, 3);
			}, 0);
		}

		return E('div', {}, [ updateBtn, ' ', forceBtn, this.showFastConfig ? E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': function() { location.href = L.url('admin/services/AdGuardHome/manual'); }
		}, _('Fast config')) : '', this.logContainer ]);
	},

	renderPasswordWidget: function(option, section_id) {
		var value = option.cfgvalue(section_id) || '';
		var input = E('input', {
			'id': option.cbid(section_id),
			'name': option.cbid(section_id),
			'type': 'text',
			'class': 'cbi-input-text',
			'value': value,
			'data-update': 'change'
		});

		return E('div', {}, [
			input, ' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'click': function(ev) {
					ev.preventDefault();
					var btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = _('loading...');

					function calculate() {
						if (input.value !== '') {
							input.value = TwinBcrypt.hashSync(input.value);
							btn.textContent = _('Please save/apply');
						}
						else {
							btn.textContent = _('is empty');
							btn.disabled = false;
						}
					}

					if (typeof TwinBcrypt === 'undefined') {
						var script = document.createElement('script');
						script.src = L.resource('twin-bcrypt.min.js');
						script.onload = function() { btn.disabled = false; btn.textContent = _('Culculate'); };
						document.head.appendChild(script);
					}
					else {
						calculate();
					}
				}
			}, _('Load culculate model'))
		]);
	},

	render: function(data) {
		var configpath = readUci('configpath', '/etc/AdGuardHome.yaml');
		var binpath = readUci('binpath', '/usr/bin/AdGuardHome');
		var httpport = readUci('httpport', '3000');
		var workdir = readUci('workdir', '/etc/AdGuardHome');
		var m, s, o;
		var self = this;

		this.runningUpdate = data[1] != null;
		this.hadUpdateError = data[2] != null;

		m = new form.Map('AdGuardHome', 'AdGuard Home', _('Free and open source, powerful network-wide ads & trackers blocking DNS server.'));

		s = m.section(form.TypedSection, 'AdGuardHome');
		s.anonymous = true;
		s.addremove = false;

		s.tab('basic', _('Main Config'));
		s.tab('core', _('Core Config'));
		s.tab('other', _('Other Config'));

		o = s.taboption('basic', form.Flag, 'enabled', _('Enable'));
		o.default = '0';
		o.optional = false;

		o = s.taboption('basic', form.Value, 'httpport', _('Browser management port'));
		o.placeholder = '3000';
		o.default = '3000';
		o.datatype = 'port';
		o.optional = false;

		o = s.taboption('basic', form.ListValue, 'core_version', _('Core Version'));
		o.value('latest', _('Latest Version'));
		o.value('beta', _('Beta Version'));
		o.default = 'latest';

		o = s.taboption('basic', form.DummyValue, '_upgrade', _('Upgrade Core'));
		o.rawhtml = true;
		o.cfgvalue = function() { return ''; };
		o.renderWidget = function(section_id) { return self.renderUpgradeWidget(section_id); };
		o.load = function(section_id) {
			return Promise.all([ exists(configpath), exists(binpath), L.resolveDefault(shell('%s --version 2>&1'.format(binpath)), { stdout: '' }) ]).then(function(res) {
				self.showFastConfig = !res[0];
				var v = res[2].stdout || '';
				var mver = v.match(/version\s+([^,\s]+)/);
				var text = (mver ? mver[1] : (res[1] ? _('core error') : _('no core')));
				if (!res[0]) text += ' ' + _('no config');
				this.description = _('Current core version:') + '<strong><font id="updateversion" color="green">%s </font></strong>'.format(text);
			}.bind(this));
		};

		o = s.taboption('basic', form.ListValue, 'redirect', _('Redirect'), _('AdGuardHome redirect mode'));
		o.value('none', _('none'));
		o.value('dnsmasq-upstream', _('Run as dnsmasq upstream server'));
		o.value('redirect', _('Redirect 53 port to AdGuardHome'));
		o.value('exchange', _('Use port 53 replace dnsmasq'));
		o.default = 'none';
		o.optional = true;

		o = s.taboption('basic', form.Value, 'hashpass', _('Change management password'), _('Press load culculate model and culculate finally save/apply'));
		o.default = '';
		o.datatype = 'string';
		o.optional = true;
		o.renderWidget = function(section_id) { return self.renderPasswordWidget(this, section_id); };
		o.formvalue = function(section_id) { var el = document.getElementById(this.cbid(section_id)); return el ? el.value : ''; };

		o = s.taboption('basic', form.Flag, 'waitonboot', _('Start up only when the network is normal'));
		o.default = '1';
		o.optional = false;

		o = s.taboption('core', form.Value, 'binpath', _('Bin Path'), _('AdGuardHome Bin path if no bin will auto download'));
		o.default = '/usr/bin/AdGuardHome';
		o.datatype = 'string';
		o.rmempty = false;
		o.validate = function(section_id, value) { return value === '' ? _('Expecting: non-empty value') : true; };

		o = s.taboption('core', form.ListValue, 'upxflag', _('use upx to compress bin after download'));
		o.value('', _('none'));
		o.value('-1', _('compress faster'));
		o.value('-9', _('compress better'));
		o.value('--best', _('compress best(can be slow for big files)'));
		o.value('--brute', _('try all available compression methods & filters [slow]'));
		o.value('--ultra-brute', _('try even more compression variants [very slow]'));
		o.default = '';
		o.rmempty = true;
		o.description = _('bin use less space,but may have compatibility issues');

		o = s.taboption('core', form.Value, 'configpath', _('Config Path'), _('AdGuardHome config path'));
		o.default = '/etc/AdGuardHome.yaml';
		o.datatype = 'string';
		o.rmempty = false;

		o = s.taboption('core', form.Value, 'workdir', _('Work dir'), _('AdGuardHome work dir include rules,audit log and database'));
		o.default = '/etc/AdGuardHome';
		o.datatype = 'string';
		o.rmempty = false;
		o.write = function(section_id, value) { return this.super('write', [ section_id, stripSlash(value) ]); };

		o = s.taboption('core', form.Value, 'logfile', _('Runtime log file'), _('AdGuardHome runtime Log file if \'syslog\': write to system log;if empty no log'));
		o.datatype = 'string';
		o.rmempty = true;

		o = s.taboption('core', form.Flag, 'verbose', _('Verbose log'));
		o.default = '0';
		o.optional = true;

		o = s.taboption('other', form.DynamicList, 'upprotect', _('Keep files when system upgrade'));
		o.value('$binpath', _('core bin'));
		o.value('$configpath', _('config file'));
		o.value('$logfile', _('log file'));
		o.value('$workdir/data/sessions.db', _('sessions.db'));
		o.value('$workdir/data/stats.db', _('stats.db'));
		o.value('$workdir/data/querylog.json', _('querylog.json'));
		o.value('$workdir/data/filters', _('filters'));
		o.widget = 'checkbox';
		o.optional = true;

		o = s.taboption('other', form.MultiValue, 'backupfile', _('Backup workdir files when shutdown'));
		o.value('filters', 'filters');
		o.value('stats.db', 'stats.db');
		o.value('querylog.json', 'querylog.json');
		o.value('sessions.db', 'sessions.db');
		o.widget = 'checkbox';
		o.optional = false;
		o.description = _('Will be restore when workdir/data is empty');
		o.load = function(section_id) {
			return L.resolveDefault(fs.list(workdir + '/data'), []).then(function(entries) {
				entries.forEach(function(e) {
					if ([ 'filters', 'stats.db', 'querylog.json', 'sessions.db' ].indexOf(e.name) < 0)
						o.value(e.name, e.name);
				});
			});
		};

		o = s.taboption('other', form.Value, 'backupwdpath', _('Backup workdir path'));
		o.default = '/etc/AdGuardHome';
		o.datatype = 'string';
		o.optional = false;
		o.depends('backupfile', 'filters');
		o.depends('backupfile', 'stats.db');
		o.depends('backupfile', 'querylog.json');
		o.depends('backupfile', 'sessions.db');
		o.write = function(section_id, value) { return this.super('write', [ section_id, stripSlash(value) ]); };

		o = s.taboption('other', form.MultiValue, 'crontab', _('Crontab task'), _('Please change time and args in crontab'));
		o.value('autohost', _('Auto update ipv6 hosts and restart AdGuardHome'));
		o.value('autogfw', _('Auto update gfwlist and restart AdGuardHome'));
		o.value('autogfwipset', _('Auto update ipset list and restart AdGuardHome'));
		o.widget = 'checkbox';
		o.optional = false;

		o = s.taboption('other', form.Button, '_gfwdel', _('Del gfwlist'));
		o.inputtitle = _('Del');
		o.onclick = function() { return shell('sh /usr/share/AdGuardHome/gfw2adg.sh del 2>&1').then(function() { location.reload(); }); };

		o = s.taboption('other', form.Button, '_gfwadd', _('Add gfwlist'));
		o.inputtitle = _('Add');
		o.onclick = function() { return shell('sh /usr/share/AdGuardHome/gfw2adg.sh 2>&1').then(function() { location.reload(); }); };

		o = s.taboption('other', form.Button, '_gfwipsetdel', _('Del gfwlist') + ' ' + _('(ipset only)'));
		o.inputtitle = _('Del');
		o.onclick = function() { return shell('sh /usr/share/AdGuardHome/gfwipset2adg.sh del 2>&1').then(function() { location.reload(); }); };

		o = s.taboption('other', form.Button, '_gfwipsetadd', _('Add gfwlist') + ' ' + _('(ipset only)'));
		o.inputtitle = _('Add');
		o.onclick = function() { return shell('sh /usr/share/AdGuardHome/gfwipset2adg.sh 2>&1').then(function() { location.reload(); }); };

		o = s.taboption('other', form.Value, 'gfwupstream', _('Gfwlist upstream dns server'), _('Gfwlist domain upstream dns service'));
		o.default = 'tcp://208.67.220.220:5353';
		o.datatype = 'string';
		o.optional = false;

		return fs.write('/var/run/AdG_log_pos', '0').catch(function() {}).then(function() {
			return m.render().then(function(node) {
				return E([ self.renderStatus(httpport), node ]);
			});
		});
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(function() {
			ui.changes.apply(mode === '0');
			return shell('/etc/init.d/AdGuardHome reload >/dev/null 2>&1 &');
		});
	}
});
