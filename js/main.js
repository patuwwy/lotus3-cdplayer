var APP = {
    TRACKS: [
        "l3_cd1-breathless.mod",
        "l3_cd2-metalmachine.mod",
        "l3_cd3_lotus3.mod",
        "l3_cd4-spaceninja.mod",
        "l3_cd5-miamiice.mod",
        "l3_cd6-shamrip.mod",
    ],
    TRACKS_PATH: "music/",
    IMG_PATH: "img/",
    currentTrack: -1,
    currentTrackStarted: null,
    currentTrackTime: "00-00:00",
    currentTrackTimeSeconds: 0,
    controlsEnabled: true,
    vu: [0, 0, 0, 0, 0, 0, 0, 0],
    debug: document.getElementById("debug"),
    init: function () {
        APP.GFX.init();
        APP.CONTROLS.initEvents();
        APP.GFX.DISPLAY.init();

        APP.module = new Protracker();
        APP.module.analyserEnable = !APP.ios;
        APP.module.defaultVolume = 0.95;

        setTimeout(function () {
            var over = document.getElementsByClassName("over")[0],
                nfo = document.getElementsByClassName("nfo");

            over.className += " off";
            [].slice.call(nfo).map(function (a) {
                a.addEventListener("click", function (e) {
                    event.stopPropagation();
                    if (over.className.indexOf("off") > -1) {
                        over.className = over.className.replace("off", "");
                    } else {
                        over.className += " off";
                    }
                });
            });
        }, 5000);

        APP.seekingBlink = setInterval(function () {
            APP.seeking ^= 1;
        }, 800);
    },
    loadMusic: function (s) {
        s = typeof s === "undefined" || s;

        APP.module.stop(s);

        APP.controlsEnabled = false;
        clearInterval(APP.seekingBlink);

        APP.seekingBlink = setInterval(function () {
            APP.seeking ^= 1;
        }, 700);

        APP.module.onReady = function () {
            APP.currentTrackStarted = new Date().getTime();
            APP.currentTrackTimeSeconds = 0;

            APP.module.autostart = false;
            APP.module.onStop = function () {
                setTimeout(function () {
                    APP.CONTROLS.playNext(false);
                }, 2500);
            };
        };

        setTimeout(function () {
            APP.module.load(
                APP.TRACKS_PATH + APP.TRACKS[APP.currentTrack],
                function () {
                    APP.seeking = false;
                    clearInterval(APP.seekingBlink);
                    clearInterval(APP.songTimeInterval);

                    APP.module.play();
                    APP.songTimeInterval = setInterval(function () {
                        if (!APP.module.paused) APP.currentTrackTimeSeconds++;
                    }, 1000);
                    APP.controlsEnabled = true;
                }
            );
        }, 3500);
    },

    GFX: {
        canvas1: document.getElementById("c1"),
        ctx1: null,
        bg: null,
        init: function () {
            APP.GFX.ctx1 = APP.GFX.canvas1.getContext("2d");
            APP.GFX.canvas1.width = 720;
            APP.GFX.canvas1.height = 576;
            APP.GFX.preLoad();
            if (window && APP.GFX.canvas1.style) {
                APP.GFX.canvas1.style.marginTop =
                    ~~Math.max(
                        (window.innerHeight - APP.GFX.canvas1.clientHeight) / 2,
                        0
                    ) + "px";
            }
        },
        preLoad: function () {
            APP.GFX.bg = new Image();
            APP.GFX.bg.addEventListener("load", function () {
                APP.GFX.bgImgReady = true;
                APP.GFX.drawBG();
            });
            APP.GFX.bg.src = APP.IMG_PATH + "bg_a.png";

            APP.GFX.numbers = new Image();
            APP.GFX.numbers.addEventListener("load", function () {
                APP.GFX.canvas2 = document.createElement("canvas");
                APP.GFX.ctx2 = APP.GFX.canvas2.getContext("2d");
                APP.GFX.canvas2.width = 176;
                APP.GFX.canvas2.height = 836;
                APP.GFX.ctx2.drawImage(APP.GFX.numbers, 0, 0);
                APP.GFX.ready = true;
                APP.GFX.numImgReady = true;
            });
            APP.GFX.numbers.src = APP.IMG_PATH + "numbers.png";
        },
        drawBG: function () {
            APP.GFX.bgImgReady && APP.GFX.ctx1.drawImage(APP.GFX.bg, 0, 0);
        },
        DISPLAY: {
            init: function () {
                APP.GFX.DISPLAY.frame();
            },
            frame: function () {
                if (APP.GFX.ready) {
                    APP.GFX.drawBG();
                    APP.GFX.DISPLAY.trackTime();
                    APP.GFX.DISPLAY.vu();
                }
                window.requestAnimationFrame(APP.GFX.DISPLAY.frame);
            },
            trackTime: function () {
                var diff = APP.currentTrackTimeSeconds;

                (secs = APP.HELPERS.pad(~~diff % 60, 2)),
                    (mins = APP.HELPERS.pad(~~(diff / 60), 2)),
                    (ctrk = APP.HELPERS.pad(APP.currentTrack + 1, 2)),
                    (str = ctrk + "-" + mins + ":" + secs),
                    (x = 234 - 3 * 18),
                    (y = 322);

                if (APP.module.playing) {
                    APP.currentTrackTime = str;
                } else {
                    APP.currentTrackTime = ctrk + "-00:00";
                }

                APP.currentTrackTime.split("").map(function (a, b) {
                    switch (a) {
                        case "-":
                            break;
                        case ":":
                            break;
                        default:
                            a = parseInt(a, 10);
                            APP.GFX.DISPLAY.drawNum(a, x, y);
                    }
                    x = x + 18;
                });
            },
            drawNum: function (num, x, y) {
                if (!APP.seeking && APP.GFX.numImgReady) {
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2,
                        num * 16,
                        0,
                        16,
                        36,
                        x,
                        y,
                        16,
                        36
                    );
                }
            },
            vu: function () {
                var str = "",
                    arr = [],
                    vu8 = [],
                    i = 0;
                (x = 340), (y = 491), (d = new Date().getTime() / 750);

                if (APP.module.playing && APP.module.analyserEnable) {
                    arr = new Uint8Array(APP.module.analyser.frequencyBinCount);
                    APP.module.analyser.getByteFrequencyData(arr);

                    for (i = 0; i < 16; i += 2) {
                        vu8.push(~~((arr[i] + arr[i + 1]) / 2));
                    }

                    APP.vu = vu8;
                } else {
                    APP.vu.map(function (a, b) {
                        APP.vu[b] = Math.abs(~~(Math.sin(d + b / 4) * 192));
                    });
                }

                if (APP.GFX.numImgReady) {
                    APP.vu.map(function (a, b) {
                        var sy = Math.max(~~((a / 256) * 8 * 6), 2);

                        try {
                            APP.GFX.ctx1.drawImage(
                                APP.GFX.canvas2,
                                176,
                                0,
                                18,
                                36,
                                x,
                                y,
                                18,
                                36
                            );
                            APP.GFX.ctx1.drawImage(
                                APP.GFX.canvas2,
                                160,
                                39 - sy,
                                18,
                                sy,
                                x,
                                y - sy + 39,
                                18,
                                sy
                            );
                        } catch (e) {}

                        x += 18;
                    });
                }
            },
        },
    },

    CONTROLS: {
        initEvents: function () {
            var controls = document.querySelectorAll(".controls a"),
                a = 0;

            window.addEventListener("keyup", function (e) {
                if (!APP.controlsEnabled) return;
                switch (e.which) {
                    case 37:
                        APP.CONTROLS.playPrev(false);
                        break;
                    case 39:
                        APP.CONTROLS.playNext(false);
                        break;
                    case 32:
                        APP.CONTROLS.pause();
                }
            });

            for (a; a < 2; a++) {
                controls[a].addEventListener("click", function (e) {
                    if (!APP.controlsEnabled) return;
                    switch (e.target.className) {
                        case "prev":
                            APP.CONTROLS.playPrev(false);
                            break;
                        case "next":
                            APP.CONTROLS.playNext(false);
                            break;
                    }
                });
            }
        },

        playNext: function (s) {
            if (APP.currentTrack < APP.TRACKS.length - 1) {
                APP.currentTrack++;
            } else {
                APP.currentTrack = 0;
            }
            APP.loadMusic(s);
        },

        playPrev: function (s) {
            if (APP.currentTrack > 0) {
                APP.currentTrack--;
            } else {
                APP.currentTrack = APP.TRACKS.length - 1;
            }
            APP.loadMusic(s);
        },

        pause: function () {
            clearInterval(APP.seekingBlink);
            APP.seeking = APP.module.paused ^= 1;

            if (APP.seeking) {
                APP.seekingBlink = setInterval(function () {
                    APP.seeking ^= 1;
                }, 800);
            }
        },
    },

    HELPERS: {
        pad: function (num, size) {
            var s = "000000000" + num;
            return s.substr(s.length - size);
        },
    },
};

APP.init();
