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

SourceFileList.prototype.addFile = function(name, buffer) {
  if (this.hasFileByName(name)) {
    throw 'File with name "' + name + '" already exists.';
  }

  const id = this._idCounter.toString();
  const file = new SourceFile(name, buffer, id);
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

SourceFile = function(name, buffer, id) {
  this.name = name;
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
  const wrapper = this.canvas.parentElement;
  this.canvas.width = wrapper.clientWidth;
  this.canvas.height = wrapper.clientHeight;
  const ratio = this.getDevicePixelRatio();
  this.ctx.scale(ratio, ratio);

  // Compute the size of the console in terms of characters.
  this.computeFontSize();
  const charSize = this.ctx.measureText("W");
  this.charWidth = Math.ceil(charSize.width);
  // TODO: Come up with a better way to calcualte this.
  this.charHeight = this.charWidth * 2; 
  this.nRows = Math.floor(this.canvas.height / this.charHeight);
  this.nCols = Math.floor(this.canvas.width / this.charWidth);

  this.dirty = true;
}

Console.prototype.computeFontSize = function() {
  // TODO: Seems like there should be a better way to do this.
  const offsetWidth = document.getElementById("text-size").offsetWidth;
  const pixelRatio = this.getDevicePixelRatio();
  for (var i = 1; i < 100; i++) {
    this.ctx.font = i.toString() + 'px "Source Code Pro", monospace';
    const charWidth = this.ctx.measureText("W");
    if (charWidth.width * pixelRatio >= offsetWidth) {
      break;
    }
  }
}

Console.prototype.getDevicePixelRatio = function() {
  return window.devicePixelRatio;
}

Console.prototype.draw = function() {
  if (!this.dirty) {
    return;
  }

  this.ctx.fillStyle = "#333";
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.ctx.fillStyle = "#fff";

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

const START_SRC = `welcome_msg:
bytes "Welcome to the Peritiae IDE!\\n\\nPrint a string:\\n\\n" 0

hello_world:
bytes "Hello, World!" 0

try_hash_msg:
bytes "Hash it with SHA-256:\\n\\n" 0

nothing_to_do_msg:
bytes "That's about it... Let's keep hashing!\\n\\n" 0

start:
	// Set up the stack
	load SP 0x100000
	
	load R1 welcome_msg
	push R1
	call print_string
	
	load R1 hello_world
	push R1
	call print_string
	call print_newline
	call print_newline
	pop R1
	
	load R1 try_hash_msg
	push R1
	call print_string
	
	// Make space on the stack for the hash (32 bytes)
	load R8 32
	sub SP SP R8
	
	// Hash the string
	load R1 hello_world
	load R2 13
	copy R3 SP
	push R3
	push R2
	push R1
	CALL sha256
	pop R0
	pop R0
	pop R0

	// Print the hash
	copy R1 SP
	load R2 32
	push R2
	push R1
	call print_bytes
	pop R0
	pop R0
	call print_newline
	call print_newline
	
	load R1 nothing_to_do_msg
	push R1
	call print_string
	pop R0
	
keep_hashing_loop:
	copy R1 SP
	load R2 32
	copy R3 SP
	push R3
	push R2
	push R1
	CALL sha256
	pop R0
	pop R0
	pop R0
	
	copy R1 SP
	load R2 32
	push R2
	push R1
	call print_bytes
	pop R0
	pop R0
	call print_newline
	
	// Thanks for checking out this demo! Disable the breakpoint and press play
	// to let the simulator run indefinitely.
	// You can click on the DIP (chip) icon above to watch the CPU register and
	// flags change as it executes. You can also click on the RAM icon and
	// search for "fffff" to view the stack and see the memory updated in
	// real-time.
	jmp keep_hashing_loop
`

const SHA_256_SRC = `sha256_h:
	words 0x6a09e667 0xbb67ae85 0x3c6ef372 0xa54ff53a 0x510e527f 0x9b05688c 0x1f83d9ab 0x5be0cd19

sha256_k:
	words 0x428a2f98 0x71374491 0xb5c0fbcf 0xe9b5dba5 0x3956c25b 0x59f111f1 0x923f82a4 0xab1c5ed5 0xd807aa98 0x12835b01 0x243185be 0x550c7dc3 0x72be5d74 0x80deb1fe 0x9bdc06a7 0xc19bf174 0xe49b69c1 0xefbe4786 0x0fc19dc6 0x240ca1cc 0x2de92c6f 0x4a7484aa 0x5cb0a9dc 0x76f988da 0x983e5152 0xa831c66d 0xb00327c8 0xbf597fc7 0xc6e00bf3 0xd5a79147 0x06ca6351 0x14292967 0x27b70a85 0x2e1b2138 0x4d2c6dfc 0x53380d13 0x650a7354 0x766a0abb 0x81c2c92e 0x92722c85 0xa2bfe8a1 0xa81a664b 0xc24b8b70 0xc76c51a3 0xd192e819 0xd6990624 0xf40e3585 0x106aa070 0x19a4c116 0x1e376c08 0x2748774c 0x34b0bcb5 0x391c0cb3 0x4ed8aa4a 0x5b9cca4f 0x682e6ff3 0x748f82ee 0x78a5636f 0x84c87814 0x8cc70208 0x90befffa 0xa4506ceb 0xbef9a3f7 0xc67178f2

// Computes the SHA 256 for up to 55 bytes of data.
// Args:
//   SP+4: (word) A pointer to the message to hash
//   SP+8: (word) The number of bytes in the message
//   SP+12: (word) A pointer to the buffer where the hash result should be stored
sha256:
	// Store the base pointer and update it to point to the top of the frame.
	push BP
	copy BP SP
	
	// <--- You hit a beakpoint! Click on a line number to enable/disable break
	// points. Note that breaks will only occur on lines with instructions.
	// Press the play or step button to continue executing.
	nop
	
	// Allocate variables on the stack
	// SP + 0: 64 byte buffer
	// SP + 64: 8 words for variable h
	// SP + 96: 256 bytes for variable w
	load R8 352
	sub SP SP R8
	
	// Initialize h0-h7
	// R1 will point to sha256_h
	// R2 will point to the destination on the stack
	// R3 will point to the end of sha256_h
	load R1 sha256_h
	copy R2 SP
	load R8 64
	add R2 R2 R8
	load R3 sha256_h
	load R8 32
	add R3 R3 R8
init_hx_loop:
	load R8 @R1
	store @R2 R8
	load R8 4
	add R1 R1 R8
	add R2 R2 R8
	cmp R1 R3
	bne init_hx_loop
	
	// Get ready to copy bytes from the input.
	// R1 is the number of bytes in the buffer.
	// R3 source pointer.
	// R4 contains the message size (max number of bytes to process).
	// R5 destination pointer.
	// R2,R6-R8 are temporary.
	load R1 0
	// Get the address of the message. The message is located 8 bytes above BP.
	copy R3 BP
	load R8 8
	add R3 R3 R8
	load R3 @R3
	// Get the message size. This is located 12 bytes above BP.
	copy R4 BP
	load R8 12
	add R4 R4 R8
	load R4 @R4
	// Get the first open space in the buffer (the first element).
	copy R5 SP
	
	// Fill the buffer and process it when full.
fill_buffer:
	// If we have copied the whole message then stop filling the buffer.
	cmp R1 R4
	be copy_complete
	
	// Read a byte
	load#b R8 @R3
	store#b @R5 R8
	load R8 1
	add R1 R1 R8 // Increment the buffer count.
	add R3 R3 R8 // Increment the source pointer.
	add R5 R5 R8 // Increment the destination pointer.
	
	// Check if we have read too many bytes.
	load R8 55
	cmp R1 R8
	bl fill_buffer
	// We've read too many bytes and are too lazy to handle multiple chunks!
	halt

copy_complete:
	// Add the 1 bit, zero pad, append the size.
	// R1 is still the buffer size.
	// R4 still contains the message size
	// R5 is still the destination pointer.
	// We're now done with R3, so R2,R3,R6-R8 are temporary.
	
	// Append the 1 bit
	load R8 0x80
	store#b @R5 R8
	// Increment the buffer count.
	load R8 1
	add R1 R1 R8
	add R5 R5 R8
	
	// Zero pad until the buffer contains 56 bytes.
	load R8 1
	load R7 56
zero_pad_loop:
	cmp R1 R7
	be zero_pad_loop_exit
	store#b @R5 R0
	add R1 R1 R8
	add R5 R5 R8
	jmp zero_pad_loop

zero_pad_loop_exit:
	// We now need to append the message size (measured in bits) in 64 bit,
	// big-endian format. Since the message is at most 55 bytes, the first 32
	// bits will be 0.
	store @R5 R0
	load R8 4
	add R5 R5 R8
	// We'll write the size LSB first. Point R5 to the last byte
	load R7 3
	add R5 R5 R7
	// Constants we'll use multiple times.
	load R7 1
	load R6 8 // Shift count (8 bits)
	// Copy the message size and scale to bits so we can shift it.
	copy R8 R4
	load R2 3
	shl R8 R8 R2
	// Write byte 0
	store#b @R5 R8
	// Decrement R5
	sub R5 R5 R7
	// Shift the message size so the next byte is the LSB
	shr R8 R8 R6
	// Write byte 1
	store#b @R5 R8
	// Decrement R5
	sub R5 R5 R7
	// Shift the message size so the next byte is the LSB
	shr R8 R8 R6
	// Write byte 2
	store#b @R5 R8
	// Decrement R5
	sub R5 R5 R7
	// Shift the message size so the next byte is the LSB
	shr R8 R8 R6
	// Write byte 3
	store#b @R5 R8
	// The buffer is now ready for hashing.
	
	// Process the buffer
	// At this point we'll discard the previous variables.
	// Get a pointers to places:
	// R1 will point to the buffer we just populated.
	// R2 will point to the 64 word variable w
	// R7 will point to the end of the buffer.
	copy R1 SP
	copy R2 SP
	load R8 96
	add R2 R2 R8
	load R8 64
	copy R7 SP
	add R7 R7 R8
	
	// Read the buffer into w. The buffer is interpreted as 16 32-bit words
	// We need to read the words as big-endian.
fill_w:
	load R8 1
	load#b R3 @R1 // Read byte 3
	add R1 R1 R8
	load#b R4 @R1 // Read byte 2
	add R1 R1 R8
	load#b R5 @R1 // Read byte 1
	add R1 R1 R8
	load#b R6 @R1 // Read byte 0
	add R1 R1 R8
	// Shift the bytes read
	load R8 24
	shl R3 R3 R8
	load R8 16
	shl R4 R4 R8
	load R8 8
	shl R5 R5 R8
	// Or the bytes together to get the big-endian word.
	copy R8 R0
	or R8 R8 R3
	or R8 R8 R4
	or R8 R8 R5
	or R8 R8 R6
	// Write the 32 bit word to w.
	store @R2 R8
	// Increment the w pointer by one word.
	load R8 4
	add R2 R2 R8
	// Check if we're done copying the buffer.
	cmp R1 R7
	bne fill_w
	
	// We lost our pointer to w. Recalculate it and place in R1.
	// Forget about the other variables.
	copy R1 SP
	load R8 96
	add R1 R1 R8

	// We now need to extend the first 16 words of w (which we just populated)
	// into the next 48 words by doing a bunch of bit twiddling.
	// Hold onto your butts!
	// Use R2 as a counter (i) for the index range [16, 63]. Since we are
	// indexing words we'll multiply the range by 4, so it's [64, 252]
	load R2 64

extend_message_schedule_loop:
	// Compute s0 := (w[i-15] rightrotate  7) xor (w[i-15] rightrotate 18) xor (w[i-15] rightshift  3)
	// Read w[i-15] into R3
	add R3 R1 R2
	load R8 60 // 15 * 4
	sub R3 R3 R8
	load R3 @R3
	// Right rotate w[i-15] by 7 and push to the stack
	// R4-R8 are not currently in use.
	copy R4 R3
	copy R5 R3
	load R8 7
	shr R4 R4 R8
	load R8 25 // 32 - 7
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Right rotate w[i-15] by 18 and push to the stack
	// R4-R8 are not currently in use.
	copy R4 R3
	copy R5 R3
	load R8 18
	shr R4 R4 R8
	load R8 14 // 32 - 18
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Right shift w[i-15] by 3 and then xor with the two rotated values
	load R8 3
	shr R3 R3 R8
	pop R4
	xor R3 R3 R4
	pop R4
	xor R3 R3 R4
	// s0 is now in R3. Push to the stack for later.
	push R3
	
	// Compute s1 := (w[i- 2] rightrotate 17) xor (w[i- 2] rightrotate 19) xor (w[i- 2] rightshift 10)
	// Read w[i-2] into R3
	add R3 R1 R2
	load R8 8 // 2 * 4
	sub R3 R3 R8
	load R3 @R3
	// Right rotate w[i-2] by 17 and push to the stack
	// R4-R8 are not currently in use.
	copy R4 R3
	copy R5 R3
	load R8 17
	shr R4 R4 R8
	load R8 15 // 32 - 17
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Right rotate w[i-2] by 19 and push to the stack
	// R4-R8 are not currently in use.
	copy R4 R3
	copy R5 R3
	load R8 19
	shr R4 R4 R8
	load R8 13 // 32 - 19
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Right shift w[i-2] by 10 and then xor with the two rotated values
	load R8 10
	shr R3 R3 R8
	pop R4
	xor R3 R3 R4
	pop R4
	xor R3 R3 R4
	// s1 is now in R3. Push to the stack for later.
	push R3
	
	// Compute w[i] := w[i-16] + s0 + w[i-7] + s1
	// Figure out where w[i] is and place it in R3
	add R3 R1 R2
	// Load w[i-16] into R4
	load R8 64 // 16 * 4
	sub R4 R3 R8
	load R4 @R4
	// Load w[i-7] into R5
	load R8 28 // 7 * 4
	sub R5 R3 R8
	load R5 @R5
	// Compute w[i] in R4
	pop R6 // s1
	pop R7 // s0
	add R4 R4 R5
	add R6 R6 R7
	add R4 R4 R6
	// Write the value to w[i]
	store @R3 R4
	
	// Increment i (R2)
	load R8 4
	add R2 R2 R8
	// Check to see if we're done
	load R8 256
	cmp R2 R8
	bne extend_message_schedule_loop
	
	// Time to compress w.
	// R1 still points to w
	// Create temporary variables a-h from h0-h7
	load R8 92 // 64 + 4*7
	copy R2 SP
	add R2 R2 R8 // Points to h7
	load R8 4
	load R7 8 // Loop counter
	load R6 1
copy_temp_vars_loop:
	load R3 @R2
	push R3
	sub R2 R2 R8 // Point to next hX
	sub R7 R7 R6 // Decrement counter
	cmp R7 R0
	bne copy_temp_vars_loop
	// a-h are now at SP
	
	// R2 will be our new counter for the index range [0, 63]. Since we are
	// indexing words we'll multiply the range by 4, so it's [0, 252]
	load R2 0
	
compression_loop:
	// Compute S1 := (e rightrotate 6) xor (e rightrotate 11) xor (e rightrotate 25)
	// Load e into R3
	load R8 16 // 4 * 4
	copy R3 SP
	add R3 R3 R8
	load R3 @R3
	// Rotate e right by 6 and push to the stack.
	copy R4 R3
	copy R5 R3
	load R8 6
	shr R4 R4 R8
	load R8 26 // 32 - 6
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Rotate e right by 11 and push to the stack.
	copy R4 R3
	copy R5 R3
	load R8 11
	shr R4 R4 R8
	load R8 21 // 32 - 11
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Rotate e right by 25.
	copy R4 R3
	copy R5 R3
	load R8 25
	shr R4 R4 R8
	load R8 7 // 32 - 25
	shl R5 R5 R8
	or R4 R4 R5
	// xor the three values together
	pop R5
	xor R4 R4 R5
	pop R5
	xor R4 R4 R5
	// S1 is now in R4. Push to the stack for later.
	push R4
	
	// Compute ch := (e and f) xor ((not e) and g)
	// e is still in R3
	// Load f into R4
	load R8 24 // 4*5 + 4 (for S1)
	copy R4 SP
	add R4 R4 R8
	load R4 @R4
	// Load g into R5
	load R8 28 // 4*6 + 4 (for S1)
	copy R5 SP
	add R5 R5 R8
	load R5 @R5
	// Compute ch
	and R6 R3 R4
	not R7 R3
	and R7 R7 R5
	xor R6 R6 R7
	// ch is now in R6. Push to the stack for later.
	push R6
	
	// Compute temp1 := h + S1 + ch + k[i] + w[i]
	// Push h onto the stack
	load R8 36 // 4*7 + 8 (for S1 and ch)
	copy R3 SP
	add R3 R3 R8
	load R3 @R3
	push R3
	// Push k[i] onto the stack
	load R3 sha256_k
	add R3 R3 R2
	load R3 @R3
	push R3
	// Get w[i]
	copy R3 R1
	add R3 R3 R2
	load R3 @R3
	// Add k[i]
	pop R4
	add R3 R3 R4
	// Add h
	pop R4
	add R3 R3 R4
	// Add ch
	pop R4
	add R3 R3 R4
	// Add S1
	pop R4
	add R3 R3 R4
	// temp1 is now in R3. Push to the stack for later.
	push R3
	
	// Compute S0 := (a rightrotate 2) xor (a rightrotate 13) xor (a rightrotate 22)
	// Load a into R3
	load R8 4 // 0 * 4 + 4 (for temp1)
	copy R3 SP
	add R3 R3 R8
	load R3 @R3
	// Rotate a right by 2 and push to the stack.
	copy R4 R3
	copy R5 R3
	load R8 2
	shr R4 R4 R8
	load R8 30 // 32 - 2
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Rotate a right by 13 and push to the stack.
	copy R4 R3
	copy R5 R3
	load R8 13
	shr R4 R4 R8
	load R8 19 // 32 - 13
	shl R5 R5 R8
	or R4 R4 R5
	push R4
	// Rotate a right by 22.
	copy R4 R3
	copy R5 R3
	load R8 22
	shr R4 R4 R8
	load R8 10 // 32 - 22
	shl R5 R5 R8
	or R4 R4 R5
	// xor the three values together
	pop R5
	xor R4 R4 R5
	pop R5
	xor R4 R4 R5
	// S0 is now in R4. Push to the stack for later.
	push R4
	
	// Compute maj := (a and b) xor (a and c) xor (b and c)
	// a is already in R3
	// Load b into R4
	load R8 12 // 1 * 4 + 8 (for temp1 and S0)
	copy R4 SP
	add R4 R4 R8
	load R4 @R4
	// Load c into R5
	load R8 16 // 2 * 4 + 8 (for temp1 and S0)
	copy R5 SP
	add R5 R5 R8
	load R5 @R5
	// Calculate maj
	and R6 R3 R4 // a AND b
	and R7 R3 R5 // a AND c
	and R8 R4 R5 // b AND c
	xor R6 R6 R7
	xor R6 R6 R8
	// maj is now in R6
	// Calculate temp2
	pop R8
	add R6 R6 R8
	// temp2 is now in R6. Push to the stack for later.
	push R6
	
	// Every day I'm shufflin'
	// R1 and R2 still in use (w and i)
	// tmp2 and tmp1 are now on the stack, a-h are after.
	// Use R3 as the source and R4 as the destination
	copy R3 SP
	copy R4 SP
	load R8 8
	add R3 R3 R8
	add R4 R4 R8
	// h := g
	load R8 24 // 6 * 4
	add R3 R3 R8
	load R8 28 // 7 * 4
	add R4 R4 R8
	load R5 @R3
	store @R4 R5
	// g := f
	// Move R3 and R4 back one word.
	load R8 4
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	store @R4 R5
	// f := e
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	store @R4 R5
	// e := d + temp1
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	// load temp1 and add to R5 (d)
	copy R7 SP
	add R7 R7 R8
	load R7 @R7
	add R5 R5 R7
	store @R4 R5
	// d := c
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	store @R4 R5
	// c := b
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	store @R4 R5
	// b := a
	sub R3 R3 R8
	sub R4 R4 R8
	load R5 @R3
	store @R4 R5
	// a := temp1 + temp2
	sub R4 R4 R8
	pop R8
	pop R7
	add R8 R8 R7
	store @R4 R8
	
	// End of the compression loop. Check to see if we should continue.
	load R8 4
	add R2 R2 R8
	load R8 256
	cmp R2 R8
	bne compression_loop
	
	// Add the compressed chunk to the current hash value
	// Point R1 to h0
	copy R1 SP
	load R8 96 // Past a-h and the buffer
	add R1 R1 R8
	// Point R2 to a
	copy R2 SP
	// Word size
	load R3 4
	// End pointer (h)
	copy R4 SP
	load R8 32
	add R4 R4 R8
	// h0 := h0 + a and likewise for h1-h7.
update_hash_loop:
	load R8 @R1
	load R7 @R2
	add R8 R8 R7
	store @R1 R8
	add R1 R1 R3
	add R2 R2 R3
	cmp R2 R4
	bne update_hash_loop
	
	// Compression is done. Clean up variables a-h.
	load R8 32
	add SP SP R8

	// We're done hashing! Let's copy the hash to the output
	// We need to copy big-endian.
	// R1 will be the source pointer
	copy R1 SP
	load R8 64
	add R1 R1 R8
	// R2 will be the destination pointer. We'll copy LSB first, so point to
	// the last byte of the first word.
	copy R2 BP
	load R8 16
	add R2 R2 R8
	load R2 @R2
	load R8 3
	add R2 R2 R8
	// R3 will be the end pointer
	copy R3 R1
	load R8 32
	add R3 R3 R8
	// Some constants
	load R4 8
	load R5 1
	load R6 4
	load R7 7
	
output_hash_loop:
	// Copy a word to the destination
	load R8 @R1
	store#b @R2 R8 // Byte 0
	shr R8 R8 R4
	sub R2 R2 R5
	store#b @R2 R8 // Byte 1
	shr R8 R8 R4
	sub R2 R2 R5
	store#b @R2 R8 // Byte 2
	shr R8 R8 R4
	sub R2 R2 R5
	store#b @R2 R8 // Byte 3
	// Update the source and destination pointers
	add R1 R1 R6
	add R2 R2 R7
	// Check to see if we're done
	cmp R1 R3
	bne output_hash_loop
	
	// Clean up the stack frame
	load R8 352
	add SP SP R8
	pop BP
	ret
`

const PRINT_SRC = `hex_lookup:
bytes '0' '1' '2' '3' '4' '5' '6' '7' '8' '9' 'A' 'B' 'C' 'D' 'E' 'F'

// Prints a null terminated string to the console.
// Args:
//   SP+4: The address of the string to print.
print_string:
	copy R1 SP
	load R8 4
	add R1 R1 R8
	load R1 @R1
	load R8 1
print_string_loop:
	load#b R7 @R1
	cmp R0 R7
	be print_string_done
	printc R7
	add R1 R1 R8
	jmp print_string_loop
print_string_done:
	ret

// Prints a newline character to the console.
// Args: none
print_newline:
	load R1 '\\n'
	printc R1
	ret

// Prints bytes to the console as a hex string.
// Args:
//   SP+4: The address of the bytes to print
//   SP+8: The number of bytes to print
print_bytes:
	// Get the source pointer
	copy R1 SP
	load R8 4
	add R1 R1 R8
	load R1 @R1
	// Get an end pointer
	copy R2 SP
	load R8 8
	add R2 R2 R8
	load R2 @R2
	add R2 R2 R1
	// Some constants
	load R3 1
	load R4 4
	load R5 0xF

print_hash_loop:
	load#b R6 @R1
	copy R7 R6
	shr R6 R6 R4
	and R6 R6 R5
	and R7 R7 R5
	load R8 hex_lookup
	add R8 R8 R6
	load#b R8 @R8
	printc R8
	load R8 hex_lookup
	add R8 R8 R7
	load#b R8 @R8
	printc R8

	add R1 R1 R3
	cmp R1 R2
	bne print_hash_loop
	ret`

function setupDemo(sourceFileList) {
  const printDoc = CodeMirror.Doc(PRINT_SRC, null);
  const sha256Doc = CodeMirror.Doc(SHA_256_SRC, null);
  const startDoc = CodeMirror.Doc(START_SRC, null);

  sourceFileList.addFile("print", printDoc);
  sourceFileList.addFile("sha256", sha256Doc);
  sourceFileList.addFile("start", startDoc);

  sha256Doc.setGutterMarker(19, "breakpoints", createBreakpointMarker());
  startDoc.setGutterMarker(90, "breakpoints", createBreakpointMarker());
}
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
      const marker = createBreakpointMarker();
      editor.setGutterMarker(n, "breakpoints", marker);
    }
    triggerEvent("breakpointsChanged");
  });

  sourceFileList = new SourceFileList();
  setupDemo(sourceFileList);

  terminal = new Console('console');
  logger = new Logger('log');

  controllers.push(new VmController());
  controllers.push(new TerminalController());
  controllers.push(new CpuInfoController());
  controllers.push(new MemoryInfoController());
  controllers.push(new FileListDisplayController());
  controllers.push(new CreateFileModalController());
  controllers.push(new LogController());
  controllers.push(new SaveController());

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
  sourceFileList.addFile(fileName, CodeMirror.Doc("", null));
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

SaveController = function() {}

SaveController.prototype.initialize = function() {
  $("#save").click(() => {
    alert("Sorry, saving isn't implemented yet. Stay tuned!");
  });
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

function createBreakpointMarker() {
  const marker = document.createElement("div");
  marker.style.color = "#822";
  marker.innerHTML = "●";
  return marker;
}
