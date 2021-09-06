function VirtualMachine() {
  this.module = null;
  this.instance = null;
};

VirtualMachine.prototype.initialize = function() {
  this.instance.exports.initialize();
};

VirtualMachine.prototype.createContext = function(request = {}) {
  return this._makeRequest(
      this.instance.exports.CreateContext, request);
};

VirtualMachine.prototype.resetVm = function(request) {
  return this._makeRequest(
      this.instance.exports.ResetVm, request);
};

VirtualMachine.prototype.loadExecutableFromSources = function(request) {
  return this._makeRequest(
      this.instance.exports.LoadExecutableFromSources, request);
};

VirtualMachine.prototype.executeVm = function(request) {
  return this._makeRequest(
      this.instance.exports.ExecuteVm, request);
};

VirtualMachine.prototype.getCpuState = function(request) {
  return this._makeRequest(
      this.instance.exports.GetCpuState, request);
};

VirtualMachine.prototype.getDebugInfoForAddress = function(request) {
  return this._makeRequest(
      this.instance.exports.GetDebugInfoForAddress, request);
};

VirtualMachine.prototype.setBreakpoints = function(request) {
  return this._makeRequest(
      this.instance.exports.SetBreakpoints, request);
};

VirtualMachine.prototype.flushConsole = function(request) {
  return this._makeRequest(
      this.instance.exports.FlushConsole, request);
};

VirtualMachine.prototype._makeRequest = function(method, request) {
  // Create a Uint8Array containing the serialized request.
  let requestSrc = new TextEncoder().encode(JSON.stringify(request));
  // Allocate space for the request.
  let requestPos = this.instance.exports.allocateArg(requestSrc.byteLength);
  // Create a Uint8Array that represents a slice where the request will be
  // written.
  let requestDst = new Uint8Array(
      this.instance.exports.memory.buffer, requestPos, requestSrc.byteLength);
  // Copy the request into the VM memory.
  requestDst.set(requestSrc);

  // Execute the request.
  if (method() !== 0) {
    throw "Request failed.";
  }

  // Get the position and size of the response.
  let responsePos = this.instance.exports.getResponse();
  let responseSize = this.instance.exports.getResponseSize();
  // Create a Uint8Array that represents a slace where the response is.
  let responseSrc = new Uint8Array(
      this.instance.exports.memory.buffer, responsePos, responseSize);
  // Decode the response and convert it to an object.
  let response = JSON.parse(new TextDecoder().decode(responseSrc)); 
  return response;
};

VirtualMachine.wasi = {
  args_get: (argv, argv_buf) => 0,
  args_sizes_get: (argc, argv_buf_size) => 0,
  clock_res_get: (id, resolution) => 0,
  clock_time_get: (id, precision, time) => 0,
  environ_get: (environ, environ_buf) => 0,
  environ_sizes_get: (environc, environ_buf_size) => 0,
  fd_advise: (fd, offset, len, advice) => 0,
  fd_allocate: (fd, offset, len) => 0,
  fd_close: (fd) => 0,
  fd_datasync: (fd) => 0,
  fd_fdstat_get: (fd, stat) => 0,
  fd_fdstat_set_flags: (fd, flags) => 0,
  fd_fdstat_set_rights: (fd, fs_rights_base, fs_rights_inheriting) => 0,
  fd_filestat_get: (fd, buf) => 0,
  fd_filestat_set_size: (fd, size) => 0,
  fd_filestat_set_times: (fd, atim, mtim, fst_flags) => 0,
  fd_pread: (fd, iovs, iovs_len, offset, nread) => 0,
  fd_prestat_dir_name: (fd, path, path_len) => 0,
  fd_prestat_get: (fd, buf) => 0,
  fd_pwrite: (fd, iovs, iovs_len, offset, nwritten) => 0,
  fd_read: (fd, iovs, iovs_len, nread) => 0,
  fd_readdir: (fd, buf, buf_len, cookie, bufused) => 0,
  fd_renumber: (fd, to) => 0,
  fd_seek: (fd, offset, whence, newoffset) => 0,
  fd_sync: (fd) => 0,
  fd_tell: (fd, offset) => 0,
  fd_write: (fd, iovs, iovs_len, nwritten) => 0,
  path_create_directory: (fd, path, path_len) => 0,
  path_filestat_get: (fd, flags, path, path_len, buf) => 0,
  path_filestat_set_times: (fd, flags, path, path_len, atim, mtim, fst_flags) => 0,
  path_link: (old_fd, old_flags, old_path, old_path_len, new_fd, new_path, new_path_len) => 0,
  path_open: (fd, dirflags, path, path_len, oflags, fs_rights_base, fs_rights_inherting, fdflags, opened_fd) => 0,
  path_readlink: (fd, path, path_len, buf, buf_len, bufused) => 0,
  path_remove_directory: (fd, path, path_len) => 0,
  path_rename: (fd, old_path, old_path_len, new_fd, new_path, new_path_len) => 0,
  path_symlink: (old_path, old_path_len, fd, new_path, new_path_len) => 0,
  path_unlink_file: (fd, path, path_len) => 0,
  poll_oneoff: (in_, out, nsubscriptions, nevents) => 0,
  proc_exit: (rval) => 0,
  proc_raise: (sig) => 0,
  random_get: (buf, buf_len) => 0,
  sched_yield: () => 0,
  sock_recv: (fd, ri_data, ri_data_len, ri_flags, ro_datalen, ro_flags) => 0,
  sock_send: (fd, si_data, si_data_len, si_flags, so_datalen) => 0,
  sock_shutdown: (fd, how) => 0,
};

VirtualMachine._createImports = function(vm, terminal, logger) {
  return {
    env: { 
      console_log: function(level, ptr, len) {
        const buffer = vm.instance.exports.memory.buffer;
        const str = new TextDecoder().decode(new Uint8Array(buffer, ptr, len));
        logger.log(level, str);
      },
      vm_print: function(ptr, len) {
        const buffer = vm.instance.exports.memory.buffer;
        const str = new TextDecoder().decode(new Uint8Array(buffer, ptr, len));
        terminal.write(str);
      },
      log_instruction: function(ptr, len) {
      },
    },
    wasi_snapshot_preview1: VirtualMachine.wasi,
  };
};

VirtualMachine.create = function(binPath, terminal, logger) {
  let vm = new VirtualMachine();
  let imports = VirtualMachine._createImports(vm, terminal, logger);
  return WebAssembly.instantiateStreaming(fetch(binPath), imports)
    .then(resultObj => {
        vm.module = resultObj.module;
        vm.instance = resultObj.instance;
        return vm;
    });
};

const SourceType = Object.freeze({
  "ASM": 1,
});

SourceFileList = function() {
  this._filesById = {};
  this._filesByName = {};
  this._idCounter = 0;
  this._fileCount = 0;
  this._selected = null;
  this._invalidateListeners = [];
}

SourceFileList.prototype.addInvalidateListener = function(listener) {
  this._invalidateListeners.push(listener);
}

SourceFileList.prototype.invalidate = function(listener) {
  this._invalidateListeners.forEach((x) => x());
}

SourceFileList.prototype.size = function() {
  return this._fileCount;
}

SourceFileList.prototype.getSelected = function() {
  return this._selected;
}

SourceFileList.prototype.select = function(fileId) {
  if (!this._filesById.hasOwnProperty(fileId)) {
    throw 'File with id "' + fileId + '" does not exist.';
  }
  this._selected = fileId;
}

SourceFileList.prototype.getFiles = function() {
  const files = Object.values(this._filesById);
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

SourceFileList.prototype.getFile = function(fileId) {
  return this._filesById[fileId];
}

SourceFileList.prototype.addFile = function(name, type, buffer) {
  if (this.hasFileByName(name)) {
    throw 'File with name "' + name + '" already exists.';
  }

  const id = this._idCounter.toString();
  const file = new SourceFile(name, type, buffer, id);
  this._filesById[id] = file;
  this._filesByName[name] = file;
  this._idCounter += 1;
  this._fileCount += 1;
  this._selected = id;
  this.invalidate();
  return id;
}

SourceFileList.prototype.removeFile = function(fileId) {
  if (!this._filesById.hasOwnProperty(fileId)) {
    throw 'File with id "' + fileId + '" does not exist.';
  }

  const file = this._filesById[fileId];
  delete this._filesById[fileId];
  delete this._filesByName[file.name];
  if (this._selected === fileId) {
    // TODO: Select the next most recently selected file.
    this._selected = Object.keys(this._filesById)[0]; 
  }
  this._fileCount -= 1;
  this.invalidate();
}

SourceFileList.prototype.hasFileByName = function(name) {
  return this._filesByName.hasOwnProperty(name);
}

SourceFileList.prototype.getFileByName = function(name) {
  return this._filesByName[name] || null;
}

SourceFile = function(name, type, buffer, id) {
  this.name = name;
  this.type = type;
  this.buffer = buffer;
  this.id = id;
}
const LogLevel = Object.freeze({
  "DEBUG": 0,
  "INFO": 1,
  "WARNING": 2,
  "ERROR": 3,
});

Logger = function(logId) {
  this._log = document.getElementById(logId);
  this._logListeners = []
}

Logger.prototype.log = function(level, msg) {
  const p = document.createElement("p");
  const content = document.createTextNode(msg);
  p.appendChild(content);
  this._log.appendChild(p);
  this._logListeners.forEach((x) => x(level, msg));
}

Logger.prototype.addLogListener = function(listener) {
  this._logListeners.push(listener);
}
const LINE_BUFFER_TARGET_SIZE = 1000000;
const MAX_LINE_LENGTH = 10000;

function Console(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext("2d");
  this.drawTimer = setInterval(() => this.draw(), 100); 
  this.nRows = 0;
  this.nCols = 0;
  this.charWidth = 0;
  this.charHeight = 0;
  this.locked = false;
  this.reset();

  $(this.canvas).bind('mousewheel', ((e) => {
    if(e.originalEvent.wheelDelta / 120 > 0) {
      this.scrollUp();
    } else {
      this.scrollDown();
    }
  }).bind(this));
}

Console.prototype.reset = function() {
  this.lineBuffer = new LineBuffer(LINE_BUFFER_TARGET_SIZE);
  this.dirty = false;
  this.computeResize();
  this.draw();
}

Console.prototype.computeResize = function() {
  // Scale the canvas so we don't have stretching.
  let wrapper = this.canvas.parentElement;
  this.canvas.width = wrapper.clientWidth;
  this.canvas.height = wrapper.clientHeight;
  // TODO: Does this actually work? My devicePixelRatio is 1.
  let ratio = window.devicePixelRatio;
  this.ctx.scale(ratio, ratio);

  // Compute the size of a character and the size of the in terms of
  // characters.
  let charSize = this.ctx.measureText("W");
  this.charWidth = Math.ceil(charSize.width);
  // TODO: Come up with a better way to calcualte this.
  this.charHeight = this.charWidth * 2; 
  this.nRows = Math.floor(this.canvas.height / this.charHeight);
  this.nCols = Math.floor(this.canvas.width / this.charWidth);

  this.dirty = true;
}

Console.prototype.draw = function() {
  if (!this.dirty) {
    return;
  }

  this.ctx.fillStyle = "#333";
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  // TODO: Detect the font size from the style.
  this.ctx.font = '1em "Source Code Pro", monospace';
  this.ctx.fillStyle = "#fffaea";

  let lines = this.lineBuffer.getLines(this.nRows, this.nCols);
  for (var i = 0; i < this.nRows; i++) {
    this.ctx.fillText(lines[i].text, 0, (i+1)*this.charHeight);
  }

  this.dirty = false;
}

Console.prototype.lock = function() {
  this.lineBuffer.pinLine(this.lineBuffer.endLine);
  this.locked = true;
}

Console.prototype.unlock = function() {
  this.locked = false;
}

Console.prototype.scrollUp = function(str) {
  if (this.locked) {
    return;
  }

  if (this.lineBuffer.isPinnedToEnd()) {
    let lines = this.lineBuffer.getLines(this.nRows, this.nCols);
    if (lines.length <= 0 || lines[0].line < 0) {
      return;
    }
    this.lineBuffer.pinLine(lines[0].line);
    if (lines[0].col <= 0 && lines[0].line > this.lineBuffer.startLine) {
      this.lineBuffer.pinLine(lines[0].line - 1);
    }
  } else {
    if (this.lineBuffer.pinnedLine > this.lineBuffer.startLine) {
      this.lineBuffer.pinLine(this.lineBuffer.pinnedLine - 1);
    }
  }
  this.dirty = true;
  this.draw();
}

Console.prototype.scrollDown = function(str) {
  if (this.locked || this.lineBuffer.isPinnedToEnd()) {
    return;
  }
  // If the pinned line is close to the end of the buffer then
  // we'll need to make sure that we don't overscroll.
  if (this.lineBuffer.pinnedLine > this.lineBuffer.endLine - this.nRows) {
    let lines = this.lineBuffer.getLines(this.nRows, this.nCols);
    let maxLine = Math.max.apply(null, lines.map(l => l.line)); 
    if (maxLine >= this.lineBuffer.endLine) {
      this.lineBuffer.pinLine(this.lineBuffer.endLine);
    }
  } else {
    this.lineBuffer.pinLine(this.lineBuffer.pinnedLine + 1);
  }
  this.dirty = true;
  this.draw();
}

Console.prototype.write = function(str) {
  this.lineBuffer.write(str);
  this.dirty = true;
}

function LineBuffer(targetSize) {
  this.data = {0: []};
  this.targetSize = targetSize;
  this.startLine = 0;
  this.endLine = 0;
  this.size = 0;
  this.pinnedLine = 0;
}

LineBuffer.prototype.pinLine = function(line) {
  if (line < this.startLine || line > this.endLine) {
    throw 'Invalid line number.';
  }
  this.pinnedLine = line;
}

LineBuffer.prototype.write = function(str) {
  var pinnedToEnd = this.isPinnedToEnd();

  for (var i = 0; i < str.length; i++) {
    if (str[i] === '\n') {
      this.endLine += 1;
      this.data[this.endLine] = [];
    } else if (this.data[this.endLine].length < MAX_LINE_LENGTH) {
      this.size += 1;
      this.data[this.endLine].push(str[i]);
    }
  }  
  
  if (pinnedToEnd) {
    this.pinnedLine = this.endLine;
  }

  this.trim();
}

LineBuffer.prototype.trim = function() {
  while (this.size > this.targetSize) {
    if (this.endLine - this.startLine <= 1) {
      break;
    }
    if (this.pinnedLine === this.startLine) {
      this.pinnedLine += 1;
    }
    this.size -= this.data[this.startLine].length;
    delete this.data[this.startLine];
    this.startLine += 1;
  }
}

LineBuffer.prototype.isPinnedToEnd = function() {
  return this.pinnedLine == this.endLine;
}

LineBuffer.prototype.getLines = function(nRows, nCols) {
  let pinnedToEnd = this.isPinnedToEnd();

  // Figure out where to start.
  var begin = this.pinnedLine;
  if (pinnedToEnd) {
    var maxChars = nRows * nCols;
    var charCount = this.data[begin].length;
    while(charCount < maxChars && begin > this.startLine) {
      begin -= 1;
      charCount += this.data[begin].length;
    }  
  }

  // Create rows of text.
  let rows = [];
  while (true) {
    var row = {line: begin, col: 0, text: []};
    for (var i = 0; i < this.data[begin].length; i++) {
      row.text.push(this.data[begin][i]);
      if (row.text.length == nCols) {
        row.text = row.text.join('');
        rows.push(row);
        row = {line: begin, col: i+1, text: []};
      }
    }
    // If the row wrapped or the row is an empty line.
    if (row.text.length > 0 || row.col === 0) {
      row.text = row.text.join('');
      rows.push(row);
    }
    if (begin === this.endLine) {
      break;
    }
    if (!pinnedToEnd && rows.length >= nRows) {
      break;
    }
    begin += 1;
  }

  // Fill in any missing rows if we don't have enough.
  while (rows.length < nRows) {
    rows.push({line: -1, col: 0, text: ''});
  }

  // Trim the number of rows to equal nRows
  if (pinnedToEnd) {
    return rows.slice(-nRows);
  }
  return rows.slice(0, nRows); 
}

const SAMPLE_PROGRAM_1 = `start:
LOAD R1 32
PRINTC R1

LOAD R1 48
LOAD R2 1
LOAD R3 57

loop:
CMP R1 R3
BG done
PRINTC R1
ADD R1 R1 R2
JMP loop

done:
LOAD R1 33
PRINTC R1
LOAD R1 10
PRINTC R1
HALT`;
const SAMPLE_PROGRAM_2 = `start:
LOAD R1 1
LOAD R2 1
LOAD R3 '\\n'

loop:
PRINTI R1
PRINTC R3
ADD R1 R1 R2
JMP loop`;

var vm = null;
var context = null;
var terminal = null;
var logger = null;
var editor = null;
var sourceFileList = null;
var controllers = [];

function triggerEvent(eventId) {
  controllers.forEach((c) => {
    if (typeof c[eventId] === 'function') {
      c[eventId]();
    }
  });
}

$(document).ready(function() {
  editor = CodeMirror($('#code-container-column')[0], {
    lineNumbers: true,
    lineWrapping: true,
    mode: null,
    gutters: ["CodeMirror-linenumbers", "breakpoints"]
    /*value=document*/
  });
  editor.on("gutterClick", function(editor, n) {
    const info = editor.lineInfo(n);
    if (info.gutterMarkers) {
      editor.setGutterMarker(n, "breakpoints", null);
    } else {
      const marker = document.createElement("div");
      marker.style.color = "#822";
      marker.innerHTML = "●";
      editor.setGutterMarker(n, "breakpoints", marker);
    }
    triggerEvent("breakpointsChanged");
  });

  sourceFileList = new SourceFileList();
  sourceFileList.addFile(
      "xyz", SourceType.ASM, CodeMirror.Doc("", null));
  sourceFileList.addFile(
      "start", SourceType.ASM, CodeMirror.Doc(SAMPLE_PROGRAM_1, null));

  terminal = new Console('console');
  logger = new Logger('log');

  controllers.push(new VmController());
  controllers.push(new TerminalController());
  controllers.push(new CpuInfoController());
  controllers.push(new MemoryInfoController());
  controllers.push(new FileListDisplayController());
  controllers.push(new CreateFileModalController());
  controllers.push(new LogController());

  triggerEvent('initialize');
  $(window).resize(() => triggerEvent('resize'))

  VirtualMachine.create('wasm/vm.wasm', terminal, logger).then(vm_ => {
    vm = vm_;
    vm.initialize();
    context = vm.createContext().context;
    console.log(context)
  });
});


const VmStates = Object.freeze({
  "STOPPED": 1,
  "RUNNING": 2,
  "PAUSED": 3,
});

VmController = function() {
  this._state = VmStates.STOPPED;
  this._runInterval = null;
  this._cyclesPerInterval = 1000;
  this._startTime = null;
  this._lastClockUpdateTime = null;
}

VmController.prototype.initialize = function() {
  // TODO: These won't work until the VirtualMachine is initialized.
  $("#run").click((() => {
      switch(this._state) {
        case VmStates.STOPPED:
          this._beginExecution();
          break;
        case VmStates.PAUSED:
          this._resumeExecution();
          break;
        default:
          // Do nothing.
      }
  }).bind(this));
  $("#step").click(this._step.bind(this));
  $("#pause").click(this._pause.bind(this));
  $("#stop").click(this._stopExecution.bind(this));
  this._stopExecution();
}

VmController.prototype.breakpointsChanged = function() {
  if (this._state == VmStates.STOPPED) {
    return;
  }
  setBreakpoints();
}

VmController.prototype._updateButtons = function() {
  $('#run').addClass('disabled');
  $('#step').addClass('disabled');
  $('#pause').addClass('disabled');
  $('#stop').addClass('disabled');

  switch(this._state) {
    case VmStates.STOPPED:
      $('#run').removeClass('disabled');
      break;
    case VmStates.PAUSED:
      $('#step').removeClass('disabled');
      $('#run').removeClass('disabled');
      $('#stop').removeClass('disabled');
      break;
    case VmStates.RUNNING:
      $('#pause').removeClass('disabled');
      $('#stop').removeClass('disabled');
      break;
    default:
      throw 'Encountered unexpected state.';
  }
}

VmController.prototype._beginExecution = function() {
  if (this._state != VmStates.STOPPED) {
    return;
  }
  triggerEvent('beforeBeginExecution');

  console.log(vm.resetVm({context: context}));
  terminal.reset();

  const sources = sourceFileList.getFiles().map(file => ({
      source_type: "ASM",
      name: file.name,
      text: file.buffer.getValue(),
  }));

  const result = vm.loadExecutableFromSources({
      context: context,
      sources: sources, 
  });
  if (!result.success) {
    return;
  }

  setBreakpoints();
  this._runInterval = setInterval(this._doExecutionInterval.bind(this), 100);
  this._startTime = performance.now();
  this._lastClockUpdateTime = this._startTime;
  this._cyclesPerInterval = 1000;
  this._state = VmStates.RUNNING;
  this._updateButtons();
  triggerEvent('beginExecution');
}

VmController.prototype._resumeExecution = function() {
  if (this._state != VmStates.PAUSED) {
    return;
  }

  this._runInterval = setInterval(this._doExecutionInterval.bind(this), 100);
  this._startTime = performance.now();
  this._lastClockUpdateTime = this._startTime;
  this._state = VmStates.RUNNING;
  this._updateButtons();
  triggerEvent('resumeExecution');
}

VmController.prototype._step = function() {
  if (this._state != VmStates.PAUSED) {
    return;
  }

  triggerEvent('resumeExecution');

  let result = vm.executeVm({
      context: context,
      steps: 1,
  });

  vm.flushConsole({context: context});

  if (result.halted) {
    this._stopExecution();
    return;
  } else {
    this._pauseExecution();
  }
}

VmController.prototype._pause = function() {
  if (this._state != VmStates.RUNNING) {
    return;
  }
  this._pauseExecution();
}

VmController.prototype._doExecutionInterval = function() {
  let t0 = performance.now();
  let result = vm.executeVm({
      context: context,
      steps: this._cyclesPerInterval
  });
  let t1 = performance.now();

  // Target 50% of the time.
  this._cyclesPerInterval = Math.floor((this._cyclesPerInterval/(t1 - t0)) * 60);
  // Cap at 10 MHz.
  this._cyclesPerInterval = Math.min(1000000, this._cyclesPerInterval);

  if (t1 - this._lastClockUpdateTime > 1000) {
    this._lastClockUpdateTime = t1;
    let freq = result.step_count / (t1 - this._startTime);
    $('#clock-freq').text(Math.floor(freq) + ' kHz');
  }

  vm.flushConsole({context: context});

  if (result.halted) {
    this._stopExecution();
    return;
  }
  if (result.hit_break) {
    this._pauseExecution();
    return;
  }
}

VmController.prototype._pauseExecution = function() {
  if (this._state === VmStates.STOPPED) {
    return;
  }

  if (this._runInterval !== null) {
    clearInterval(this._runInterval);
    this._runInterval = null;
  }
  this._state = VmStates.PAUSED;
  this._updateButtons();
  $('#clock-freq').text('0 kHz');
  triggerEvent('pauseExecution');
}

// This should always work regardless of the state.
VmController.prototype._stopExecution = function() {
  if (this._runInterval !== null) {
    clearInterval(this._runInterval);
    this._runInterval = null;
  }

  this._state = VmStates.STOPPED;
  this._updateButtons();
  $('#clock-freq').text('0 kHz');
  triggerEvent('stopExecution');
}

TerminalController = function() {
  this._resizeTimeout = null;
}

TerminalController.prototype.initialize = function() {
  $("#terminal").click(() => $('#console').show());
  $("#registers").click(() => $('#console').hide());
  $("#memory").click(() => $('#console').hide());
}

TerminalController.prototype.resize = function() {
  $('#console').hide();
  clearTimeout(this._resizeTimeout);
  this._resizeTimeout = setTimeout(function () {
    $('#console').show();
    terminal.computeResize();
    terminal.draw();
  }, 100);
}

TerminalController.prototype.beginExecution = function() {
  terminal.reset();
  terminal.lock();
}

TerminalController.prototype.resumeExecution = function() {
  terminal.lock();
}

TerminalController.prototype.stopExecution = function() {
  terminal.unlock();
}

TerminalController.prototype.pauseExecution = function() {
  terminal.unlock();
}

CpuInfoController = function() {
  this._refreshInterval = null;
}

CpuInfoController.prototype.initialize = function() {
  $("#terminal").click(this._hide.bind(this));
  $("#memory").click(this._hide.bind(this));
  $("#registers").click(this._show.bind(this));
}

CpuInfoController.prototype._hide = function() {
  $('#cpu-info').hide();
  clearInterval(this._refreshInterval);
}

CpuInfoController.prototype._show = function() {
  $('#cpu-info').show();
  this._refresh();
  this._refreshInterval = setInterval(
      () => this._refresh(), 250);
}

CpuInfoController.prototype._refresh = function() {
  let cpuState = vm.getCpuState({'context': context});
  $('#cpu-info-pc-hex').text(uint32ToHex(cpuState['pc']));
  $('#cpu-info-pc-unsigned').text(cpuState['pc']);
  $('#cpu-info-pc-signed').text(uint32ToSigned(cpuState['pc']));
  $('#cpu-info-bp-hex').text(uint32ToHex(cpuState['bp']));
  $('#cpu-info-bp-unsigned').text(cpuState['bp']);
  $('#cpu-info-bp-signed').text(uint32ToSigned(cpuState['bp']));
  $('#cpu-info-sp-hex').text(uint32ToHex(cpuState['sp']));
  $('#cpu-info-sp-unsigned').text(cpuState['sp']);
  $('#cpu-info-sp-signed').text(uint32ToSigned(cpuState['sp']));
  $('#cpu-info-r0-hex').text(uint32ToHex(cpuState['r0']));
  $('#cpu-info-r0-unsigned').text(cpuState['r0']);
  $('#cpu-info-r0-signed').text(uint32ToSigned(cpuState['r0']));
  $('#cpu-info-r1-hex').text(uint32ToHex(cpuState['r1']));
  $('#cpu-info-r1-unsigned').text(cpuState['r1']);
  $('#cpu-info-r1-signed').text(uint32ToSigned(cpuState['r1']));
  $('#cpu-info-r2-hex').text(uint32ToHex(cpuState['r2']));
  $('#cpu-info-r2-unsigned').text(cpuState['r2']);
  $('#cpu-info-r2-signed').text(uint32ToSigned(cpuState['r2']));
  $('#cpu-info-r3-hex').text(uint32ToHex(cpuState['r3']));
  $('#cpu-info-r3-unsigned').text(cpuState['r3']);
  $('#cpu-info-r3-signed').text(uint32ToSigned(cpuState['r3']));
  $('#cpu-info-r4-hex').text(uint32ToHex(cpuState['r4']));
  $('#cpu-info-r4-unsigned').text(cpuState['r4']);
  $('#cpu-info-r4-signed').text(uint32ToSigned(cpuState['r4']));
  $('#cpu-info-r5-hex').text(uint32ToHex(cpuState['r5']));
  $('#cpu-info-r5-unsigned').text(cpuState['r5']);
  $('#cpu-info-r5-signed').text(uint32ToSigned(cpuState['r5']));
  $('#cpu-info-r6-hex').text(uint32ToHex(cpuState['r6']));
  $('#cpu-info-r6-unsigned').text(cpuState['r6']);
  $('#cpu-info-r6-signed').text(uint32ToSigned(cpuState['r6']));
  $('#cpu-info-r7-hex').text(uint32ToHex(cpuState['r7']));
  $('#cpu-info-r7-unsigned').text(cpuState['r7']);
  $('#cpu-info-r7-signed').text(uint32ToSigned(cpuState['r7']));
  $('#cpu-info-r8-hex').text(uint32ToHex(cpuState['r8']));
  $('#cpu-info-r8-unsigned').text(cpuState['r8']);
  $('#cpu-info-r8-signed').text(uint32ToSigned(cpuState['r8']));
  $('#cpu-info-overflow').text(cpuState['overflow']);
  $('#cpu-info-carry').text(cpuState['carry']);
  $('#cpu-info-sign').text(cpuState['sign']);
  $('#cpu-info-zero').text(cpuState['zero']);
  $('#cpu-info-halt').text(cpuState['halt']);
}

MemoryInfoController = function() {
  this._refreshInterval = null;
}

MemoryInfoController.prototype.initialize = function() {
  $("#terminal").click(this._hide.bind(this));
  $("#registers").click(this._hide.bind(this));
  $("#memory").click(this._show.bind(this));
  $("#memory-info-search").keydown(this._filterKeyDown.bind(this));
  $("#memory-info-search").keyup(this._filterKeyUp.bind(this));
  $("#memory-info-search").keyup(this._refresh.bind(this));
}

MemoryInfoController.prototype._hide = function() {
  $('#memory-info').hide();
  clearInterval(this._refreshInterval);
}

MemoryInfoController.prototype._show = function() {
  $('#memory-info').show();
  this._refresh();
  this._refreshInterval = setInterval(
      () => this._refresh(), 250);
}

MemoryInfoController.prototype._filterKeyDown = function(e) {
  // Allow control characters.
  if (e.altKey || e.ctrlKey || e.metaKey) {
    return;
  }

  // Allow backspace or delete
  if (e.which === 8 || e.which === 46) {
    return;
  }

  const c = String.fromCharCode(event.which);
  if (!/[0-9A-Fa-f]/.test(c)) {
    e.preventDefault();
  }
}

MemoryInfoController.prototype._filterKeyUp = function() {
  let value = $("#memory-info-search").val();
  value = value.replace(/[^0-9A-Fa-f]/g, '');
  $("#memory-info-search").val(value);
}

MemoryInfoController.prototype._parseStartAddress = function() {
  const searchText = $("#memory-info-search").val();
  if (searchText.length <= 0) {
    return 0;
  }
  let startAddress = parseInt(searchText, 16);
  if (isNaN(startAddress)) {
    return NaN;
  }
  // Shift the address so that is 16 byte aligned.
  startAddress = startAddress - (startAddress % 16);
  return startAddress;
}

MemoryInfoController.prototype._refresh = function() {
  const cpuState = vm.getCpuState({'context': context});
  const memAddress = cpuState['mem_address'];
  const memSize = cpuState['mem_size'];
  const memoryData = new Uint8Array(
      vm.instance.exports.memory.buffer, memAddress, memSize);

  let index = this._parseStartAddress();
  index = isNaN(index) ? 0 : index;
  index = Math.min(index, memSize - (16 * 32));

  const table = document.getElementById("memory-data");
  for (var i = 1, row; row = table.rows[i]; i++) {
    for (var j = 0, col; col = row.cells[j]; j++) {
      if (j === 0) {
        $(col).text(uint32ToHex(index));
        continue;
      }

      $(col).text(uint8ToHex(memoryData[index]));
      index += 1;
    }  
  }
}

FileListDisplayController = function() {
  this._lineMarkers = [];
}

FileListDisplayController.prototype.initialize = function() {
  $("#files-show").click(this._show.bind(this));
  $("#files-hide").click(this._hide.bind(this));
  $("#delete-file").click(this._deleteFile.bind(this));
  sourceFileList.addInvalidateListener(this._refresh.bind(this));
  this._refresh();
}

FileListDisplayController.prototype._refresh = function() {
  $(".source-file").remove();
  const files = sourceFileList.getFiles();
  const selectedFile = sourceFileList.getSelected();
  const list = document.getElementById("file-list");
  files.forEach((file) => {
    const div = document.createElement("div");
    const content = document.createTextNode(file.name);
    div.appendChild(content);
    div.setAttribute("data-file-id", file.id);
    div.classList.add("source-file");
    if (selectedFile === file.id) {
      div.classList.add("file-list-selected");
    }
    list.appendChild(div); 
    $(div).click(this._fileClicked.bind(this));
  });
  this._displaySelectedInEditor();
}

FileListDisplayController.prototype._hide = function() {
  $('#collapsed-file-list-container').show();
  $('#file-list-container').hide();
  triggerEvent('resize');
}

FileListDisplayController.prototype._show = function() {
  $('#collapsed-file-list-container').hide();
  $('#file-list-container').show();
  triggerEvent('resize');
}

FileListDisplayController.prototype._displaySelectedInEditor = function() {
  const selectedFile = sourceFileList.getSelected();
  if (selectedFile === null) {
    return;
  }
  const file = sourceFileList.getFile(selectedFile);
  if (editor.getDoc() !== file.buffer) {
    editor.swapDoc(file.buffer);
  }
}

FileListDisplayController.prototype._selectFile = function(fileId) {
  const listElement = $(".source-file[data-file-id='" + fileId + "']");
  if (listElement.length <= 0) {
    return;
  }

  $('.file-list-selected').removeClass('file-list-selected');
  listElement.addClass('file-list-selected');
  sourceFileList.select(fileId);
  this._displaySelectedInEditor();
}

FileListDisplayController.prototype._fileClicked = function(e) {
  const fileId = e.currentTarget.getAttribute("data-file-id");
  this._selectFile(fileId);
}

FileListDisplayController.prototype._deleteFile = function(e) {
  let selected = $('.file-list-selected');
  if (selected.length <= 0) {
    return;
  }

  if (sourceFileList.size() <= 1) {
    alert('Cannot remove source file. At least one file is required.');
    return;
  }

  let fileId = selected.first().attr("data-file-id");
  let file = sourceFileList.getFile(fileId);
  if (!confirm(
    "Are you sure you want to remove " + file.name + "?")) {
    return;
  }

  sourceFileList.removeFile(fileId);
}

FileListDisplayController.prototype.beginExecution = function() {
  sourceFileList.getFiles().forEach(file => {
      file.buffer.cantEdit = true;
  });
  this._clearHighlightedLines();
}

FileListDisplayController.prototype.resumeExecution = function() {
  this._clearHighlightedLines();
}

FileListDisplayController.prototype.stopExecution = function() {
  sourceFileList.getFiles().forEach(file => {
      file.buffer.cantEdit = false;
  });
  this._clearHighlightedLines();
}

FileListDisplayController.prototype.pauseExecution = function() {
  const cpuState = vm.getCpuState({'context': context});
  const debugInfo = vm.getDebugInfoForAddress({
      'context': context,
      'address': cpuState.pc,
  });

  const file = sourceFileList.getFileByName(debugInfo['file_name']);
  if (file === 'null') {
    return;
  }

  this._selectFile(file.id);
  file.buffer.setCursor(debugInfo.line_number, 0);
  file.buffer.addLineClass(debugInfo.line_number, "wrap", "highlighted-line");
  this._lineMarkers.push({
    clear: () => {
      file.buffer.removeLineClass(debugInfo.line_number, "wrap", "highlighted-line");
    },
  });
}

FileListDisplayController.prototype._clearHighlightedLines = function() {
  this._lineMarkers.forEach(marker => marker.clear());
  this._lineMarkers = []
}

CreateFileModalController = function() {}

CreateFileModalController.prototype.initialize = function() {
  $('#create-file').click(this._show.bind(this));
  $('#create-file-modal .modal-close').click(this._hide.bind(this));
  $("#create-file-modal input").keyup(this._validateFilename.bind(this));
  $('#create-file-modal button').click(this._createFileClicked.bind(this));
}

CreateFileModalController.prototype._show = function() {
  $('#create-file-modal').show();
}

CreateFileModalController.prototype._hide = function() {
  $('#create-file-modal').hide();
}

CreateFileModalController.prototype._createFileClicked = function() {
  if (!this._validateFilename) {
    return;
  }

  const fileName = $("#create-file-modal input").val();
  sourceFileList.addFile(fileName, SourceType.ASM, CodeMirror.Doc("", null));
  $("#create-file-modal input").val("");
  this._hide();
}

CreateFileModalController.prototype._validateFilename = function() {
  $('#file-name-invalid-chars').hide();
  $('#file-name-already-exists').hide();
  $('#create-file-modal button').prop("disabled", true);

  const fileName = $("#create-file-modal input").val();
  if (fileName.length <= 0) {
    return false;
  }
  if (!/^[0-9A-Za-z_/-]+$/.test(fileName)) {
    $('#file-name-invalid-chars').show();
    return false;
  } 
  if (sourceFileList.hasFileByName(fileName)) {
    $('#file-name-already-exists').show();
    return false;
  }

  $('#create-file-modal button').prop("disabled", false);
  return true;
}

LogController = function() {}

LogController.prototype.initialize = function() {
  $("#log-show").click(this._show.bind(this));
  $("#log-hide").click(this._hide.bind(this));
  logger.addLogListener(this._handleLog.bind(this));
}

LogController.prototype.beforeBeginExecution = function() {
  $('#log').empty();
}

LogController.prototype._show = function() {
  $('#log').show();
  $('#log-show').hide();
  $('#log-hide').show();
  triggerEvent('resize');
}

LogController.prototype._hide = function() {
  $('#log').hide();
  $('#log-show').show();
  $('#log-hide').hide();
  triggerEvent('resize');
}

LogController.prototype._handleLog = function(level, msg) {
  if (level === LogLevel.ERROR) {
    this._show();
  }
}

function getBreakpoints() {
  const files = sourceFileList.getFiles();
  const breakpoints = files.reduce((map, file) => {
    map[file.name] = [];
    return map;
  }, {});

  for (var i = 0; i < files.length; i++) {
    const doc = files[i].buffer;
    for (var j = 0; j < doc.lineCount(); j++) {
      const info = doc.lineInfo(j);
      if (info.gutterMarkers && info.gutterMarkers['breakpoints']) {
        breakpoints[files[i].name].push(j);
      }
    }
  }

  return breakpoints;
}

function setBreakpoints() {
  const breakpoints = getBreakpoints();
  const breakpointsList = []
  for (const [key, value] of Object.entries(breakpoints)) {
    breakpointsList.push({
      'file_name': key,
      'line_numbers': value
    });
  }

  const response = vm.setBreakpoints({
    'context': context,
    'breakpoints': breakpointsList,
  });
  console.log(response);
}

function uint8ToHex(value) {
  return ("00" + value.toString(16)).substr(-2);
}

function uint32ToHex(value) {
  return ("0000000" + value.toString(16)).substr(-8);
}

function uint32ToSigned(value) {
  if (value & 0x80000000) {
    value = -1 * ((~value) + 1);
  }
  return value;
}
