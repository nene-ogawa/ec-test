(function () {
    'use strict';

    // ── URL → 吹き出し文言マッピング ──────────────────────────
    // パターンは上から順に評価。未マッチはDEFAULT_CALLOUTを使用。
    const URL_CONFIG_MAP = [
        { pattern: 'SFtest2',             callout: 'テスト用' },
        { pattern: 'nene-ogawa.github.io', callout: '何かお困りですか？' },
    ];
    const DEFAULT_CALLOUT = '何かお困りですか？';

    // ── アイコン画像（絶対URL固定）────────────────────────────
    const ICON_URL = 'https://nene-ogawa.github.io/ec-test/ChatbotIcon_trim.png';

    // ── ECv2接続設定 ───────────────────────────────────────────
    const EC = {
        orgId:        '00DIl000000H31Y',
        configName:   'SF_V1',
        siteUrl:      'https://d5h00000141dheay--agent0507.sandbox.my.site.com/ESWSFV11783329435238',
        scrt2URL:     'https://d5h00000141dheay--agent0507.sandbox.my.salesforce-scrt.com',
        bootstrapSrc: 'https://d5h00000141dheay--agent0507.sandbox.my.site.com/ESWSFV11783329435238/assets/js/bootstrap.min.js',
    };

    // ── 状態 ───────────────────────────────────────────────────
    let chatReady   = false;
    let isMinimized = false;
    let isMaximized = false;

    // ── URL → 吹き出し文言 ────────────────────────────────────
    function getCalloutText(url) {
        for (const rule of URL_CONFIG_MAP) {
            if (url.includes(rule.pattern)) return rule.callout;
        }
        return DEFAULT_CALLOUT;
    }

    // ── CSS注入 ───────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('chat-embed-style')) return;
        const style = document.createElement('style');
        style.id = 'chat-embed-style';
        style.textContent = `
            #chat-embed-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                cursor: pointer;
                z-index: 9999;
                border: none;
                background: transparent;
                padding: 0;
                display: flex;
                max-width: 142px;
                flex-direction: column;
                justify-content: flex-end;
                align-items: flex-end;
                gap: 11px;
            }
            #chat-embed-btn .chat-callout {
                position: relative;
                padding: 8px 14px;
                border-radius: 20px;
                border: 2px solid #D6334E;
                background: #FAE6E9;
                box-shadow: 0 8px 24px -3px rgba(38, 38, 38, 0.16);
                font-size: 13px;
                font-weight: 600;
                color: #D6334E;
                white-space: nowrap;
                line-height: 1.4;
            }
            #chat-embed-btn .chat-callout::after {
                content: '';
                position: absolute;
                bottom: -11px;
                right: 20px;
                width: 0;
                height: 0;
                border-left: 9px solid transparent;
                border-right: 0 solid transparent;
                border-top: 11px solid #D6334E;
            }
            #chat-embed-btn .chat-callout::before {
                content: '';
                position: absolute;
                bottom: -7px;
                right: 21px;
                width: 0;
                height: 0;
                border-left: 7px solid transparent;
                border-right: 0 solid transparent;
                border-top: 9px solid #FAE6E9;
                z-index: 1;
            }
            #chat-embed-btn .icon-clip {
                animation: chat-embed-float 1.8s ease-in-out infinite;
                animation-play-state: paused;
            }
            #chat-embed-btn:hover .icon-clip {
                animation-play-state: running;
            }
            #chat-embed-btn .icon-img {
                width: 86px;
                height: 86px;
                object-fit: contain;
            }
            @keyframes chat-embed-float {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-10px); }
            }
            #chat-embed-maximize-btn {
                position: fixed;
                display: none;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: none;
                background: transparent;
                cursor: pointer;
                z-index: 999999;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: background 0.15s ease;
            }
            #chat-embed-maximize-btn:hover { background: rgba(0,0,0,0.08); }
            #chat-embed-maximize-btn svg { width: 18px; height: 18px; pointer-events: none; }
            body.chat-maximized .embeddedMessagingFrame,
            body.chat-maximized [class*="embeddedMessaging"]:not(.embeddedMessagingTopContainer),
            body.chat-maximized embedded-messaging,
            body.chat-maximized #embeddedMessagingFrame,
            body.chat-maximized iframe[name*="embeddedMessaging"],
            body.chat-maximized iframe[title*="チャット"],
            body.chat-maximized iframe[title*="Messaging"] {
                position: fixed !important;
                top: auto !important; left: 50% !important; right: auto !important; bottom: 0 !important;
                transform: translateX(-50%) !important;
                width: 870px !important; height: 976px !important;
                max-width: 92vw !important; max-height: 92vh !important;
                z-index: 9999 !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
            }
            body.chat-minimized .embeddedMessagingFrame,
            body.chat-minimized [class*="embeddedMessaging"]:not(.embeddedMessagingTopContainer),
            body.chat-minimized embedded-messaging,
            body.chat-minimized #embeddedMessagingFrame,
            body.chat-minimized iframe[name*="embeddedMessaging"],
            body.chat-minimized iframe[title*="チャット"],
            body.chat-minimized iframe[title*="Messaging"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ── チャットボタンDOM生成 ─────────────────────────────────
    function createButton(calloutText) {
        if (document.getElementById('chat-embed-btn')) return;

        // 最大化ボタン
        const maxBtn = document.createElement('button');
        maxBtn.id = 'chat-embed-maximize-btn';
        maxBtn.title = '最大化';
        maxBtn.setAttribute('aria-label', '最大化');
        maxBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>`;
        maxBtn.addEventListener('click', toggleMaximize);
        document.body.appendChild(maxBtn);

        // チャットボタン（吹き出し＋アイコン）
        const btn = document.createElement('button');
        btn.id = 'chat-embed-btn';
        btn.title = 'チャットを開く';
        btn.innerHTML = `
            <div class="chat-callout">${calloutText}</div>
            <div class="icon-clip">
                <img src="${ICON_URL}" class="icon-img" alt="チャットを開く">
            </div>`;
        btn.addEventListener('click', openChat);
        document.body.appendChild(btn);
    }

    // ── チャット操作 ──────────────────────────────────────────
    function openChat() {
        if (isMinimized) {
            isMinimized = false;
            document.body.classList.remove('chat-minimized');
            document.getElementById('chat-embed-btn').style.display = 'none';
            return;
        }
        if (!chatReady) {
            alert('チャットがまだ準備中です。少し待ってから再クリックしてください。');
            return;
        }
        embeddedservice_bootstrap.utilAPI.launchChat()
            .then(() => { document.getElementById('chat-embed-btn').style.display = 'none'; })
            .catch(() => console.error('チャット起動失敗'));
    }

    function toggleMaximize() {
        isMaximized = !isMaximized;
        const btn = document.getElementById('chat-embed-maximize-btn');
        document.body.classList.toggle('chat-maximized', isMaximized);
        if (btn) btn.title = isMaximized ? '通常サイズに戻す' : '最大化';
        setTimeout(updateMaximizeButton, 50);
    }

    // ── 最大化ボタン位置更新 ──────────────────────────────────
    const CHAT_SELECTORS = [
        '.embeddedMessagingFrame', '[class*="embeddedMessaging"]',
        'embedded-messaging', '#embeddedMessagingFrame',
        'iframe[name*="embeddedMessaging"]', 'iframe[title*="チャット"]', 'iframe[title*="Messaging"]',
    ];

    function findChatWindow() {
        for (const sel of CHAT_SELECTORS) {
            try { const el = document.querySelector(sel); if (el) return el; } catch (e) {}
        }
        return null;
    }

    function isChatVisible(el) {
        if (!el) return false;
        try {
            const rect = el.getBoundingClientRect();
            if (rect.width < 50 || rect.height < 100) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') >= 0.1;
        } catch (e) { return false; }
    }

    function updateMaximizeButton() {
        if (isMinimized) return;
        const btn = document.getElementById('chat-embed-maximize-btn');
        if (!btn) return;
        const chatEl = findChatWindow();
        const visible = isChatVisible(chatEl);
        if (visible && chatEl) {
            const rect = chatEl.getBoundingClientRect();
            btn.style.display = 'flex';
            btn.style.top   = Math.max(rect.top + 12, 4) + 'px';
            btn.style.right = Math.max(window.innerWidth - rect.right + 88, 4) + 'px';
            btn.style.left  = 'auto';
        } else {
            btn.style.display = 'none';
        }
    }

    // ── ECv2イベントリスナー ──────────────────────────────────
    function setupEventListeners() {
        window.addEventListener('onEmbeddedMessagingReady', () => {
            embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
                currentURL: window.location.href
            });
        });

        window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
            chatReady = true;
            embeddedservice_bootstrap.utilAPI.hideChatButton();
        });

        window.addEventListener('onEmbeddedMessagingWindowMinimized', () => {
            isMinimized = true;
            document.body.classList.add('chat-minimized');
            document.getElementById('chat-embed-btn').style.display = 'block';
        });

        window.addEventListener('onEmbeddedMessagingConversationClosed', () => {
            isMinimized = false;
            document.body.classList.remove('chat-minimized');
            document.getElementById('chat-embed-btn').style.display = 'block';
        });

        window.addEventListener('message', (event) => {
            if (!event.data || typeof event.data !== 'object') return;
            if (event.data.type === 'chat-embed-ready') {
                // LWCが準備完了の合図 → 送ってきた相手に直接URLを返す
                try {
                    event.source.postMessage({
                        type: 'chat-embed-url',
                        url: window.location.href
                    }, '*');
                } catch (e) {}
            } else if (event.data.type === 'chat-minimize') {
                isMinimized = true;
                document.body.classList.add('chat-minimized');
                document.getElementById('chat-embed-btn').style.display = 'block';
                document.getElementById('chat-embed-maximize-btn').style.display = 'none';
            } else if (event.data.type === 'chat-end-conversation') {
                window.location.reload();
            }
        });

        setInterval(updateMaximizeButton, 300);
        window.addEventListener('resize', updateMaximizeButton);
        window.addEventListener('scroll', updateMaximizeButton, true);
    }

    // ── ECv2スクリプト読み込み ────────────────────────────────
    function loadECScript() {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src  = EC.bootstrapSrc;
        script.onload = function () {
            try {
                embeddedservice_bootstrap.settings.language = 'en_US';
                embeddedservice_bootstrap.settings.hideChatButtonOnLoad = true;
                embeddedservice_bootstrap.init(EC.orgId, EC.configName, EC.siteUrl, {
                    scrt2URL: EC.scrt2URL
                });
            } catch (err) {
                console.error('Error loading Embedded Messaging:', err);
            }
        };
        document.head.appendChild(script);
    }

    // ── エントリポイント ──────────────────────────────────────
    function init() {
        if (document.getElementById('chat-embed-style')) return; // 二重実行防止
        const callout = getCalloutText(window.location.href);
        injectStyles();
        setupEventListeners();
        createButton(callout);
        loadECScript();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
