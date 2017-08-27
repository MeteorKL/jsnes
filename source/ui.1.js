/*
JSNES, based on Jamie Sanders' vNES
Copyright (C) 2010 Ben Firshman

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

JSNES.DummyUI = function (nes) {
    this.nes = nes;
    this.enable = function () { };
    this.updateStatus = function () { };
    this.writeAudio = function () { };
    this.writeFrame = function () { };
    this.imgPalette = new Array(16);
    this.sprPalette = new Array(16);
};

if (typeof jQuery !== 'undefined') {
    (function ($) {
        $.fn.JSNESUI = function (roms) {
            var parent = this;
            var buf = null;
            var buf8 = null;
            var buf32 = null;
            var UI = function (nes) {
                var self = this;
                self.nes = nes;

                /*
                 * Create UI
                 */
                self.root = $('<div></div>');
                self.screen = $('<canvas class="nes-screen" width="256" height="240"></canvas>').appendTo(self.root);
                self.emphTable = $('<div class="nes-emphTable"></div>').appendTo(self.root);

                if (!self.screen[0].getContext) {
                    parent.html("Your browser doesn't support the <code>&lt;canvas&gt;</code> tag. Try Google Chrome, Safari, Opera or Firefox!");
                    return;
                }

                // Don't blur the screen when resized
                self.screen[0].style.imageRendering = "-moz-crisp-edges";
                self.screen[0].style.imageRendering = "pixelated";

                self.romContainer = $('<div class="nes-roms"></div>').appendTo(self.root);
                self.romSelect = $('<select></select>').appendTo(self.romContainer);

                self.controls = $('<div class="nes-controls"></div>').appendTo(self.root);
                self.buttons = {
                    pause: $('<input type="button" value="pause" class="nes-pause" disabled="disabled">').appendTo(self.controls),
                    restart: $('<input type="button" value="restart" class="nes-restart" disabled="disabled">').appendTo(self.controls),
                    sound: $('<input type="button" value="disable sound" class="nes-enablesound">').appendTo(self.controls),
                    zoom: $('<input type="button" value="zoom in" class="nes-zoom">').appendTo(self.controls)
                };
                self.status = $('<p class="nes-status">Booting up...</p>').appendTo(self.root);
                self.root.appendTo(parent);

                $('<div>imgPalette:</div>').appendTo(self.emphTable);
                for (var i = 0; i < 16; i++) {
                    var square = $('<div></div>').appendTo(self.emphTable);
                    square[0].style.height = '15px';
                    square[0].style.width = '15px';
                    square[0].style.background = '#000000';
                    if ((i + 1) % 8 != 0) {
                        square[0].style.float = 'left';
                    }
                    parent.imgPalette[i] = square;
                }

                $('<div>sprPalette:</div>').appendTo(this.emphTable);
                for (var i = 0; i < 16; i++) {
                    var square = $('<div></div>').appendTo(this.emphTable);
                    square[0].style.height = '15px';
                    square[0].style.width = '15px';
                    square[0].style.background = '#000000';
                    if ((i + 1) % 8 != 0) {
                        square[0].style.float = 'left';
                    }
                    parent.sprPalette[i] = square;
                }

                $('<div></div>').appendTo(this.emphTable);
                /*
                 * ROM loading
                 */
                self.romSelect.change(function () {
                    self.loadROM();
                    $('<div>可用的颜色：</div>').appendTo(self.emphTable);
                    for (var i = 0; i < 64; i++) {
                        var color = self.nes.ppu.emphTable[i][0].toString(16);
                        color = ("000000" + color).substr(color.length);
                        var square = $('<div></div>').appendTo(self.emphTable);
                        square[0].style.height = '15px';
                        square[0].style.width = '15px';
                        square[0].style.background = '#' + color;
                        if ((i + 1) % 8 != 0) {
                            square[0].style.float = 'left';
                        }
                    }
                    $('<div></div>').appendTo(self.emphTable);
                });

                /*
                 * Buttons
                 */
                self.buttons.pause.click(function () {
                    if (self.nes.isRunning) {
                        self.nes.stop();
                        self.updateStatus("Paused");
                        self.buttons.pause.attr("value", "resume");
                    }
                    else {
                        self.nes.start();
                        self.buttons.pause.attr("value", "pause");
                    }
                });

                self.buttons.restart.click(function () {
                    self.nes.reloadRom();
                    self.nes.start();
                });

                self.buttons.sound.click(function () {
                    if (self.nes.opts.emulateSound) {
                        self.nes.opts.emulateSound = false;
                        self.buttons.sound.attr("value", "enable sound");
                    }
                    else {
                        self.nes.opts.emulateSound = true;
                        self.buttons.sound.attr("value", "disable sound");
                    }
                });

                self.zoomed = false;
                self.buttons.zoom.click(function () {
                    if (self.zoomed) {
                        self.screen.animate({
                            width: '256px',
                            height: '240px'
                        });
                        self.buttons.zoom.attr("value", "zoom in");
                        self.zoomed = false;
                    }
                    else {
                        self.screen.animate({
                            width: '512px',
                            height: '480px'
                        });
                        self.buttons.zoom.attr("value", "zoom out");
                        self.zoomed = true;
                    }
                });

                /*
                 * Lightgun experiments with mouse
                 * (Requires jquery.dimensions.js)
                 */
                if ($.offset) {
                    self.screen.mousedown(function (e) {
                        if (self.nes.mmap) {
                            self.nes.mmap.mousePressed = true;
                            // FIXME: does not take into account zoom
                            self.nes.mmap.mouseX = e.pageX - self.screen.offset().left;
                            self.nes.mmap.mouseY = e.pageY - self.screen.offset().top;
                        }
                    }).mouseup(function () {
                        setTimeout(function () {
                            if (self.nes.mmap) {
                                self.nes.mmap.mousePressed = false;
                                self.nes.mmap.mouseX = 0;
                                self.nes.mmap.mouseY = 0;
                            }
                        }, 500);
                    });
                }

                if (typeof roms != 'undefined') {
                    self.setRoms(roms);
                }

                /*
                 * Canvas
                 */
                self.canvasContext = self.screen[0].getContext('2d');

                if (!self.canvasContext.getImageData) {
                    parent.html("Your browser doesn't support writing pixels directly to the <code>&lt;canvas&gt;</code> tag. Try the latest versions of Google Chrome, Safari, Opera or Firefox!");
                    return;
                }

                self.canvasImageData = self.canvasContext.getImageData(0, 0, 256, 240);
                self.resetCanvas();

                /*
                 * Keyboard
                 */
                $(document).
                    bind('keydown', function (evt) {
                        self.nes.keyboard.keyDown(evt);
                    }).
                    bind('keyup', function (evt) {
                        self.nes.keyboard.keyUp(evt);
                    }).
                    bind('keypress', function (evt) {
                        self.nes.keyboard.keyPress(evt);
                    });

                /*
                 * Sound
                 */
                self.dynamicaudio = new DynamicAudio({
                    swf: nes.opts.swfPath + 'dynamicaudio.swf'
                });
            };

            UI.prototype = {
                loadROM: function () {
                    var self = this;
                    self.updateStatus("Downloading...");
                    $.ajax({
                        url: escape(self.romSelect.val()),
                        xhr: function () {
                            var xhr = $.ajaxSettings.xhr();
                            if (typeof xhr.overrideMimeType !== 'undefined') {
                                // Download as binary
                                xhr.overrideMimeType('text/plain; charset=x-user-defined');
                            }
                            self.xhr = xhr;
                            return xhr;
                        },
                        complete: function (xhr, status) {
                            var i, data;
                            if (JSNES.Utils.isIE()) {
                                var charCodes = JSNESBinaryToArray(
                                    xhr.responseBody
                                ).toArray();
                                data = String.fromCharCode.apply(
                                    undefined,
                                    charCodes
                                );
                            }
                            else {
                                data = xhr.responseText;
                            }
                            self.nes.loadRom(data);
                            self.nes.start();
                            self.enable();
                        }
                    });
                },

                resetCanvas: function () {
                    // Get the canvas buffer in 8bit and 32bit
                    this.buf = new ArrayBuffer(this.canvasImageData.data.length);
                    this.buf8 = new Uint8ClampedArray(this.buf);
                    this.buf32 = new Uint32Array(this.buf);

                    // Fill the canvas with black
                    this.canvasContext.fillStyle = 'black';
                    // set alpha to opaque
                    this.canvasContext.fillRect(0, 0, 256, 240);

                    // Set alpha
                    for (var i = 0; i < this.buf32.length; ++i) {
                        this.buf32[i] = 0xFF000000;
                    }
                },

                /*
                *
                * nes.ui.screenshot() --> return <img> element :)
                */
                screenshot: function () {
                    var data = this.screen[0].toDataURL("image/png"),
                        img = new Image();
                    img.src = data;
                    return img;
                },

                /*
                 * Enable and reset UI elements
                 */
                enable: function () {
                    this.buttons.pause.attr("disabled", null);
                    if (this.nes.isRunning) {
                        this.buttons.pause.attr("value", "pause");
                    }
                    else {
                        this.buttons.pause.attr("value", "resume");
                    }
                    this.buttons.restart.attr("disabled", null);
                    if (this.nes.opts.emulateSound) {
                        this.buttons.sound.attr("value", "disable sound");
                    }
                    else {
                        this.buttons.sound.attr("value", "enable sound");
                    }
                },

                updateStatus: function (s) {
                    this.status.text(s);
                },

                setRoms: function (roms) {
                    this.romSelect.children().remove();
                    $("<option>Select a ROM...</option>").appendTo(this.romSelect);
                    for (var groupName in roms) {
                        if (roms.hasOwnProperty(groupName)) {
                            var optgroup = $('<optgroup></optgroup>').
                                attr("label", groupName);
                            for (var i = 0; i < roms[groupName].length; i++) {
                                $('<option>' + roms[groupName][i][0] + '</option>')
                                    .attr("value", roms[groupName][i][1])
                                    .appendTo(optgroup);
                            }
                            this.romSelect.append(optgroup);
                        }
                    }
                },

                writeAudio: function (samples) {
                    return this.dynamicaudio.writeInt(samples);
                },

                writeFrame: function (buffer) {
                    for (var i = 0; i < 16; i++) {
                        var color = this.nes.ppu.getColor(this.nes.ppu.imgPalette[i]).toString(16);
                        color = ("000000" + color).substr(color.length);
                        this.imgPalette[i].style.background = '#' + color;
                    }

                    for (var i = 0; i < 16; i++) {
                        var color = this.nes.ppu.getColor(this.nes.ppu.sprPalette[i]).toString(16);
                        color = ("000000" + color).substr(color.length);
                        this.sprPalette[i].style.background = '#' + color;
                    }

                    var i = 0;
                    for (var y = 0 + 8; y < 240 - 8; ++y) {
                        for (var x = 0 + 8; x < 256 - 8; ++x) {
                            i = y * 256 + x;
                            // Convert pixel from NES BGR to canvas ABGR
                            this.buf32[i] = 0xff000000 | this.nes.ppu.getColor(buffer[i]); // Full alpha
                        }
                    }

                    // for (var i = 0; i < buffer.length; i++) {
                    //     this.buf32[i] = 0xFF000000 | this.nes.ppu.getColor(buffer[i]);
                    // }
                    this.canvasImageData.data.set(this.buf8);
                    this.canvasContext.putImageData(this.canvasImageData, 0, 0);
                }
            };

            return UI;
        };
    })(jQuery);
}
