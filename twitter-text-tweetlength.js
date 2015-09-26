/**
 * 2015-09-11 tsmd: ツイートの文字数カウントの機能だけ残し、そのほかの処理は削除
 *
 * @license Copyright 2011 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this work except in compliance with the License.
 * You may obtain a copy of the License below, or at:
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {
    if (typeof twttr === "undefined" || twttr === null) {
        var twttr = {};
    }

    twttr.txt = {};
    twttr.txt.regexen = {};

    // Builds a RegExp
    function regexSupplant(regex, flags) {
        flags = flags || "";
        if (typeof regex !== "string") {
            if (regex.global && flags.indexOf("g") < 0) {
                flags += "g";
            }
            if (regex.ignoreCase && flags.indexOf("i") < 0) {
                flags += "i";
            }
            if (regex.multiline && flags.indexOf("m") < 0) {
                flags += "m";
            }

            regex = regex.source;
        }

        return new RegExp(regex.replace(/#\{(\w+)\}/g, function(match, name) {
            var newRegex = twttr.txt.regexen[name] || "";
            if (typeof newRegex !== "string") {
                newRegex = newRegex.source;
            }
            return newRegex;
        }), flags);
    }

    twttr.txt.regexSupplant = regexSupplant;

    // simple string interpolation
    function stringSupplant(str, values) {
        return str.replace(/#\{(\w+)\}/g, function(match, name) {
            return values[name] || "";
        });
    }

    twttr.txt.stringSupplant = stringSupplant;

    function addCharsToCharClass(charClass, start, end) {
        var s = String.fromCharCode(start);
        if (end !== start) {
            s += "-" + String.fromCharCode(end);
        }
        charClass.push(s);
        return charClass;
    }

    twttr.txt.addCharsToCharClass = addCharsToCharClass;

    // Space is more than %20, U+3000 for example is the full-width space used with Kanji. Provide a short-hand
    // to access both the list of characters and a pattern suitible for use with String#split
    // Taken from: ActiveSupport::Multibyte::Handlers::UTF8Handler::UNICODE_WHITESPACE
    var fromCode = String.fromCharCode;
    var UNICODE_SPACES = [
        fromCode(0x0020), // White_Space # Zs       SPACE
        fromCode(0x0085), // White_Space # Cc       <control-0085>
        fromCode(0x00A0), // White_Space # Zs       NO-BREAK SPACE
        fromCode(0x1680), // White_Space # Zs       OGHAM SPACE MARK
        fromCode(0x180E), // White_Space # Zs       MONGOLIAN VOWEL SEPARATOR
        fromCode(0x2028), // White_Space # Zl       LINE SEPARATOR
        fromCode(0x2029), // White_Space # Zp       PARAGRAPH SEPARATOR
        fromCode(0x202F), // White_Space # Zs       NARROW NO-BREAK SPACE
        fromCode(0x205F), // White_Space # Zs       MEDIUM MATHEMATICAL SPACE
        fromCode(0x3000)  // White_Space # Zs       IDEOGRAPHIC SPACE
    ];
    addCharsToCharClass(UNICODE_SPACES, 0x009, 0x00D); // White_Space # Cc   [5] <control-0009>..<control-000D>
    addCharsToCharClass(UNICODE_SPACES, 0x2000, 0x200A); // White_Space # Zs  [11] EN QUAD..HAIR SPACE

    var INVALID_CHARS = [
        fromCode(0xFFFE),
        fromCode(0xFEFF), // BOM
        fromCode(0xFFFF) // Special
    ];
    addCharsToCharClass(INVALID_CHARS, 0x202A, 0x202E); // Directional change

    twttr.txt.regexen.spaces_group = regexSupplant(UNICODE_SPACES.join(""));
    twttr.txt.regexen.invalid_chars_group = regexSupplant(INVALID_CHARS.join(""));
    twttr.txt.regexen.punct = /\!'#%&'\(\)*\+,\\\-\.\/:;<=>\?@\[\]\^_{|}~\$/;
    twttr.txt.regexen.non_bmp_code_pairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/mg;

    twttr.txt.regexen.latinAccentChars = /À-ÖØ-öø-ÿĀ-ɏɓ-ɔɖ-ɗəɛɣɨɯɲʉʋʻ̀-ͯḀ-ỿ/;

    // URL related regex collection
    twttr.txt.regexen.validUrlPrecedingChars = regexSupplant(/(?:[^A-Za-z0-9@＠$#＃#{invalid_chars_group}]|^)/);
    twttr.txt.regexen.invalidUrlWithoutProtocolPrecedingChars = /[-_.\/]$/;
    twttr.txt.regexen.invalidDomainChars = stringSupplant("#{punct}#{spaces_group}#{invalid_chars_group}", twttr.txt.regexen);
    twttr.txt.regexen.validDomainChars = regexSupplant(/[^#{invalidDomainChars}]/);
    twttr.txt.regexen.validSubdomain = regexSupplant(/(?:(?:#{validDomainChars}(?:[_-]|#{validDomainChars})*)?#{validDomainChars}\.)/);
    twttr.txt.regexen.validDomainName = regexSupplant(/(?:(?:#{validDomainChars}(?:-|#{validDomainChars})*)?#{validDomainChars}\.)/);
    twttr.txt.regexen.validGTLD = regexSupplant(RegExp(
        '(?:(?:' +
        'abb|abbott|abogado|academy|accenture|accountant|accountants|aco|active|actor|ads|adult|aeg|aero|' +
        'afl|agency|aig|airforce|airtel|allfinanz|alsace|amsterdam|android|apartments|app|aquarelle|' +
        'archi|army|arpa|asia|associates|attorney|auction|audio|auto|autos|axa|azure|band|bank|bar|' +
        'barcelona|barclaycard|barclays|bargains|bauhaus|bayern|bbc|bbva|bcn|beer|bentley|berlin|best|' +
        'bet|bharti|bible|bid|bike|bing|bingo|bio|biz|black|blackfriday|bloomberg|blue|bmw|bnl|' +
        'bnpparibas|boats|bond|boo|boots|boutique|bradesco|bridgestone|broker|brother|brussels|budapest|' +
        'build|builders|business|buzz|bzh|cab|cafe|cal|camera|camp|cancerresearch|canon|capetown|capital|' +
        'caravan|cards|care|career|careers|cars|cartier|casa|cash|casino|cat|catering|cba|cbn|ceb|center|' +
        'ceo|cern|cfa|cfd|chanel|channel|chat|cheap|chloe|christmas|chrome|church|cisco|citic|city|' +
        'claims|cleaning|click|clinic|clothing|cloud|club|coach|codes|coffee|college|cologne|com|' +
        'commbank|community|company|computer|condos|construction|consulting|contractors|cooking|cool|' +
        'coop|corsica|country|coupons|courses|credit|creditcard|cricket|crown|crs|cruises|cuisinella|' +
        'cymru|cyou|dabur|dad|dance|date|dating|datsun|day|dclk|deals|degree|delivery|delta|democrat|' +
        'dental|dentist|desi|design|dev|diamonds|diet|digital|direct|directory|discount|dnp|docs|dog|' +
        'doha|domains|doosan|download|drive|durban|dvag|earth|eat|edu|education|email|emerck|energy|' +
        'engineer|engineering|enterprises|epson|equipment|erni|esq|estate|eurovision|eus|events|everbank|' +
        'exchange|expert|exposed|express|fage|fail|faith|family|fan|fans|farm|fashion|feedback|film|' +
        'finance|financial|firmdale|fish|fishing|fit|fitness|flights|florist|flowers|flsmidth|fly|foo|' +
        'football|forex|forsale|forum|foundation|frl|frogans|fund|furniture|futbol|fyi|gal|gallery|game|' +
        'garden|gbiz|gdn|gent|genting|ggee|gift|gifts|gives|giving|glass|gle|global|globo|gmail|gmo|gmx|' +
        'gold|goldpoint|golf|goo|goog|google|gop|gov|graphics|gratis|green|gripe|group|guge|guide|' +
        'guitars|guru|hamburg|hangout|haus|healthcare|help|here|hermes|hiphop|hitachi|hiv|hockey|' +
        'holdings|holiday|homedepot|homes|honda|horse|host|hosting|hoteles|hotmail|house|how|hsbc|ibm|' +
        'icbc|ice|icu|ifm|iinet|immo|immobilien|industries|infiniti|info|ing|ink|institute|insure|int|' +
        'international|investments|ipiranga|irish|ist|istanbul|itau|iwc|java|jcb|jetzt|jewelry|jlc|jll|' +
        'jobs|joburg|jprs|juegos|kaufen|kddi|kim|kitchen|kiwi|koeln|komatsu|krd|kred|kyoto|lacaixa|' +
        'lancaster|land|lasalle|lat|latrobe|law|lawyer|lds|lease|leclerc|legal|lexus|lgbt|liaison|lidl|' +
        'life|lighting|limited|limo|link|live|lixil|loan|loans|lol|london|lotte|lotto|love|ltda|lupin|' +
        'luxe|luxury|madrid|maif|maison|man|management|mango|market|marketing|markets|marriott|mba|media|' +
        'meet|melbourne|meme|memorial|men|menu|miami|microsoft|mil|mini|mma|mobi|moda|moe|mom|monash|' +
        'money|montblanc|mormon|mortgage|moscow|motorcycles|mov|movie|movistar|mtn|mtpc|museum|nadex|' +
        'nagoya|name|navy|nec|net|netbank|network|neustar|new|news|nexus|ngo|nhk|nico|ninja|nissan|nokia|' +
        'nra|nrw|ntt|nyc|office|okinawa|omega|one|ong|onl|online|ooo|oracle|orange|org|organic|osaka|' +
        'otsuka|ovh|page|panerai|paris|partners|parts|party|pet|pharmacy|philips|photo|photography|' +
        'photos|physio|piaget|pics|pictet|pictures|pink|pizza|place|play|plumbing|plus|pohl|poker|porn|' +
        'post|praxi|press|pro|prod|productions|prof|properties|property|pub|qpon|quebec|racing|realtor|' +
        'realty|recipes|red|redstone|rehab|reise|reisen|reit|ren|rent|rentals|repair|report|republican|' +
        'rest|restaurant|review|reviews|rich|ricoh|rio|rip|rocks|rodeo|rsvp|ruhr|run|ryukyu|saarland|' +
        'sakura|sale|samsung|sandvik|sandvikcoromant|sanofi|sap|sarl|saxo|sca|scb|schmidt|scholarships|' +
        'school|schule|schwarz|science|scor|scot|seat|seek|sener|services|sew|sex|sexy|shiksha|shoes|' +
        'show|shriram|singles|site|ski|sky|skype|sncf|soccer|social|software|sohu|solar|solutions|sony|' +
        'soy|space|spiegel|spreadbetting|srl|starhub|statoil|studio|study|style|sucks|supplies|supply|' +
        'support|surf|surgery|suzuki|swatch|swiss|sydney|systems|taipei|tatamotors|tatar|tattoo|tax|taxi|' +
        'team|tech|technology|tel|telefonica|temasek|tennis|thd|theater|tickets|tienda|tips|tires|tirol|' +
        'today|tokyo|tools|top|toray|toshiba|tours|town|toyota|toys|trade|trading|training|travel|trust|' +
        'tui|ubs|university|uno|uol|vacations|vegas|ventures|vermögensberater|vermögensberatung|' +
        'versicherung|vet|viajes|video|villas|vin|vision|vista|vistaprint|vlaanderen|vodka|vote|voting|' +
        'voto|voyage|wales|walter|wang|watch|webcam|website|wed|wedding|weir|whoswho|wien|wiki|' +
        'williamhill|win|windows|wine|wme|work|works|world|wtc|wtf|xbox|xerox|xin|xperia|xxx|xyz|yachts|' +
        'yandex|yodobashi|yoga|yokohama|youtube|zip|zone|zuerich|дети|ком|москва|онлайн|орг|рус|сайт|קום|' +
        'بازار|شبكة|كوم|موقع|कॉम|नेट|संगठन|คอม|みんな|グーグル|コム|世界|中信|中文网|企业|佛山|信息|健康|八卦|公司|公益|商城|商店|商标|在线|大拿|' +
        '娱乐|工行|广东|慈善|我爱你|手机|政务|政府|新闻|时尚|机构|淡马锡|游戏|点看|移动|组织机构|网址|网店|网络|谷歌|集团|飞利浦|餐厅|닷넷|닷컴|삼성|onion' +
        ')(?=[^0-9a-zA-Z@]|$))'));
    twttr.txt.regexen.validCCTLD = regexSupplant(RegExp(
        '(?:(?:' +
        'ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bl|bm|bn|bo|bq|' +
        'br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|' +
        'ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|' +
        'gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|' +
        'la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mf|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|' +
        'my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|' +
        'rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|' +
        'tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw|ελ|' +
        'бел|мкд|мон|рф|срб|укр|қаз|հայ|الاردن|الجزائر|السعودية|المغرب|امارات|ایران|بھارت|تونس|سودان|' +
        'سورية|عراق|عمان|فلسطين|قطر|مصر|مليسيا|پاکستان|भारत|বাংলা|ভারত|ਭਾਰਤ|ભારત|இந்தியா|இலங்கை|' +
        'சிங்கப்பூர்|భారత్|ලංකා|ไทย|გე|中国|中國|台湾|台灣|新加坡|澳門|香港|한국' +
        ')(?=[^0-9a-zA-Z@]|$))'));
    twttr.txt.regexen.validPunycode = regexSupplant(/(?:xn--[0-9a-z]+)/);
    twttr.txt.regexen.validSpecialCCTLD = regexSupplant(RegExp(
        '(?:(?:co|tv)(?=[^0-9a-zA-Z@]|$))'));
    twttr.txt.regexen.validDomain = regexSupplant(/(?:#{validSubdomain}*#{validDomainName}(?:#{validGTLD}|#{validCCTLD}|#{validPunycode}))/);
    twttr.txt.regexen.validAsciiDomain = regexSupplant(/(?:(?:[\-a-z0-9#{latinAccentChars}]+)\.)+(?:#{validGTLD}|#{validCCTLD}|#{validPunycode})/gi);
    twttr.txt.regexen.invalidShortDomain = regexSupplant(/^#{validDomainName}#{validCCTLD}$/i);
    twttr.txt.regexen.validSpecialShortDomain = regexSupplant(/^#{validDomainName}#{validSpecialCCTLD}$/i);

    twttr.txt.regexen.validPortNumber = regexSupplant(/[0-9]+/);

    twttr.txt.regexen.validGeneralUrlPathChars = regexSupplant(/[a-z0-9!\*';:=\+,\.\$\/%#\[\]\-_~@|&#{latinAccentChars}]/i);
    // Allow URL paths to contain up to two nested levels of balanced parens
    //  1. Used in Wikipedia URLs like /Primer_(film)
    //  2. Used in IIS sessions like /S(dfd346)/
    //  3. Used in Rdio URLs like /track/We_Up_(Album_Version_(Edited))/
    twttr.txt.regexen.validUrlBalancedParens = regexSupplant(
        '\\('                                   +
        '(?:'                                 +
        '#{validGeneralUrlPathChars}+'      +
        '|'                                 +
            // allow one nested level of balanced parentheses
        '(?:'                               +
        '#{validGeneralUrlPathChars}*'    +
        '\\('                             +
        '#{validGeneralUrlPathChars}+'  +
        '\\)'                             +
        '#{validGeneralUrlPathChars}*'    +
        ')'                                 +
        ')'                                   +
        '\\)'
        , 'i');
    // Valid end-of-path chracters (so /foo. does not gobble the period).
    // 1. Allow =&# for empty URL parameters and other URL-join artifacts
    twttr.txt.regexen.validUrlPathEndingChars = regexSupplant(/[\+\-a-z0-9=_#\/#{latinAccentChars}]|(?:#{validUrlBalancedParens})/i);
    // Allow @ in a url, but only in the middle. Catch things like http://example.com/@user/
    twttr.txt.regexen.validUrlPath = regexSupplant('(?:' +
        '(?:' +
        '#{validGeneralUrlPathChars}*' +
        '(?:#{validUrlBalancedParens}#{validGeneralUrlPathChars}*)*' +
        '#{validUrlPathEndingChars}'+
        ')|(?:@#{validGeneralUrlPathChars}+\/)'+
        ')', 'i');

    twttr.txt.regexen.validUrlQueryChars = /[a-z0-9!?\*'@\(\);:&=\+\$\/%#\[\]\-_\.,~|]/i;
    twttr.txt.regexen.validUrlQueryEndingChars = /[a-z0-9_&=#\/]/i;
    twttr.txt.regexen.extractUrl = regexSupplant(
        '('                                                            + // $1 total match
        '(#{validUrlPrecedingChars})'                                + // $2 Preceeding chracter
        '('                                                          + // $3 URL
        '(https?:\\/\\/)?'                                         + // $4 Protocol (optional)
        '(#{validDomain})'                                         + // $5 Domain(s)
        '(?::(#{validPortNumber}))?'                               + // $6 Port number (optional)
        '(\\/#{validUrlPath}*)?'                                   + // $7 URL Path
        '(\\?#{validUrlQueryChars}*#{validUrlQueryEndingChars})?'  + // $8 Query String
        ')'                                                          +
        ')'
        , 'gi');

    twttr.txt.regexen.validTcoUrl = /^https?:\/\/t\.co\/[a-z0-9]+/i;
    twttr.txt.regexen.urlHasHttps = /^https:\/\//i;

    twttr.txt.extractUrlsWithIndices = function(text, options) {
        if (!options) {
            options = {extractUrlsWithoutProtocol: true};
        }
        if (!text || (options.extractUrlsWithoutProtocol ? !text.match(/\./) : !text.match(/:/))) {
            return [];
        }

        var urls = [];

        while (twttr.txt.regexen.extractUrl.exec(text)) {
            var before = RegExp.$2, url = RegExp.$3, protocol = RegExp.$4, domain = RegExp.$5, path = RegExp.$7;
            var endPosition = twttr.txt.regexen.extractUrl.lastIndex,
                startPosition = endPosition - url.length;

            // if protocol is missing and domain contains non-ASCII characters,
            // extract ASCII-only domains.
            if (!protocol) {
                if (!options.extractUrlsWithoutProtocol
                    || before.match(twttr.txt.regexen.invalidUrlWithoutProtocolPrecedingChars)) {
                    continue;
                }
                var lastUrl = null,
                    asciiEndPosition = 0;
                domain.replace(twttr.txt.regexen.validAsciiDomain, function(asciiDomain) {
                    var asciiStartPosition = domain.indexOf(asciiDomain, asciiEndPosition);
                    asciiEndPosition = asciiStartPosition + asciiDomain.length;
                    lastUrl = {
                        url: asciiDomain,
                        indices: [startPosition + asciiStartPosition, startPosition + asciiEndPosition]
                    };
                    if (path
                        || asciiDomain.match(twttr.txt.regexen.validSpecialShortDomain)
                        || !asciiDomain.match(twttr.txt.regexen.invalidShortDomain)) {
                        urls.push(lastUrl);
                    }
                });

                // no ASCII-only domain found. Skip the entire URL.
                if (lastUrl == null) {
                    continue;
                }

                // lastUrl only contains domain. Need to add path and query if they exist.
                if (path) {
                    lastUrl.url = url.replace(domain, lastUrl.url);
                    lastUrl.indices[1] = endPosition;
                }
            } else {
                // In the case of t.co URLs, don't allow additional path characters.
                if (url.match(twttr.txt.regexen.validTcoUrl)) {
                    url = RegExp.lastMatch;
                    endPosition = startPosition + url.length;
                }
                urls.push({
                    url: url,
                    indices: [startPosition, endPosition]
                });
            }
        }

        return urls;
    };

    twttr.txt.modifyIndicesFromUTF16ToUnicode = function(text, entities) {
        twttr.txt.convertUnicodeIndices(text, entities, true);
    };

    twttr.txt.getUnicodeTextLength = function(text) {
        return text.replace(twttr.txt.regexen.non_bmp_code_pairs, ' ').length;
    };

    twttr.txt.convertUnicodeIndices = function(text, entities, indicesInUTF16) {
        if (entities.length == 0) {
            return;
        }

        var charIndex = 0;
        var codePointIndex = 0;

        // sort entities by start index
        entities.sort(function(a,b){ return a.indices[0] - b.indices[0]; });
        var entityIndex = 0;
        var entity = entities[0];

        while (charIndex < text.length) {
            if (entity.indices[0] == (indicesInUTF16 ? charIndex : codePointIndex)) {
                var len = entity.indices[1] - entity.indices[0];
                entity.indices[0] = indicesInUTF16 ? codePointIndex : charIndex;
                entity.indices[1] = entity.indices[0] + len;

                entityIndex++;
                if (entityIndex == entities.length) {
                    // no more entity
                    break;
                }
                entity = entities[entityIndex];
            }

            var c = text.charCodeAt(charIndex);
            if (0xD800 <= c && c <= 0xDBFF && charIndex < text.length - 1) {
                // Found high surrogate char
                c = text.charCodeAt(charIndex + 1);
                if (0xDC00 <= c && c <= 0xDFFF) {
                    // Found surrogate pair
                    charIndex++;
                }
            }
            codePointIndex++;
            charIndex++;
        }
    };

    // Returns the length of Tweet text with consideration to t.co URL replacement
    // and chars outside the basic multilingual plane that use 2 UTF16 code points
    twttr.txt.getTweetLength = function(text, options) {
        if (!options) {
            options = {
                // These come from https://api.twitter.com/1/help/configuration.json
                // described by https://dev.twitter.com/docs/api/1/get/help/configuration
                short_url_length: 23,
                short_url_length_https: 23
            };
        }
        var textLength = twttr.txt.getUnicodeTextLength(text),
            urlsWithIndices = twttr.txt.extractUrlsWithIndices(text);
        twttr.txt.modifyIndicesFromUTF16ToUnicode(text, urlsWithIndices);

        for (var i = 0; i < urlsWithIndices.length; i++) {
            // Subtract the length of the original URL
            textLength += urlsWithIndices[i].indices[0] - urlsWithIndices[i].indices[1];

            // Add 23 characters for URL starting with https://
            // http:// URLs still use https://t.co so they are 23 characters as well
            if (urlsWithIndices[i].url.toLowerCase().match(twttr.txt.regexen.urlHasHttps)) {
                textLength += options.short_url_length_https;
            } else {
                textLength += options.short_url_length;
            }
        }

        return textLength;
    };

    if (typeof module != 'undefined' && module.exports) {
        module.exports = twttr.txt;
    }

    if (typeof define == 'function' && define.amd) {
        define([], twttr.txt);
    }

    if (typeof window != 'undefined') {
        if (window.twttr) {
            for (var prop in twttr) {
                window.twttr[prop] = twttr[prop];
            }
        } else {
            window.twttr = twttr;
        }
    }
})();
