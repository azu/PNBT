/**
 * 2013-11-12 tsmd: ツイートの文字数カウントの機能だけ残し、そのほかの処理は削除
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

    var latinAccentChars = [];
    // Latin accented characters (subtracted 0xD7 from the range, it's a confusable multiplication sign. Looks like "x")
    addCharsToCharClass(latinAccentChars, 0x00c0, 0x00d6);
    addCharsToCharClass(latinAccentChars, 0x00d8, 0x00f6);
    addCharsToCharClass(latinAccentChars, 0x00f8, 0x00ff);
    // Latin Extended A and B
    addCharsToCharClass(latinAccentChars, 0x0100, 0x024f);
    // assorted IPA Extensions
    addCharsToCharClass(latinAccentChars, 0x0253, 0x0254);
    addCharsToCharClass(latinAccentChars, 0x0256, 0x0257);
    addCharsToCharClass(latinAccentChars, 0x0259, 0x0259);
    addCharsToCharClass(latinAccentChars, 0x025b, 0x025b);
    addCharsToCharClass(latinAccentChars, 0x0263, 0x0263);
    addCharsToCharClass(latinAccentChars, 0x0268, 0x0268);
    addCharsToCharClass(latinAccentChars, 0x026f, 0x026f);
    addCharsToCharClass(latinAccentChars, 0x0272, 0x0272);
    addCharsToCharClass(latinAccentChars, 0x0289, 0x0289);
    addCharsToCharClass(latinAccentChars, 0x028b, 0x028b);
    // Okina for Hawaiian (it *is* a letter character)
    addCharsToCharClass(latinAccentChars, 0x02bb, 0x02bb);
    // Combining diacritics
    addCharsToCharClass(latinAccentChars, 0x0300, 0x036f);
    // Latin Extended Additional
    addCharsToCharClass(latinAccentChars, 0x1e00, 0x1eff);
    twttr.txt.regexen.latinAccentChars = regexSupplant(latinAccentChars.join(""));

    // URL related regex collection
    twttr.txt.regexen.validUrlPrecedingChars = regexSupplant(/(?:[^A-Za-z0-9@＠$#＃#{invalid_chars_group}]|^)/);
    twttr.txt.regexen.invalidUrlWithoutProtocolPrecedingChars = /[-_.\/]$/;
    twttr.txt.regexen.invalidDomainChars = stringSupplant("#{punct}#{spaces_group}#{invalid_chars_group}", twttr.txt.regexen);
    twttr.txt.regexen.validDomainChars = regexSupplant(/[^#{invalidDomainChars}]/);
    twttr.txt.regexen.validSubdomain = regexSupplant(/(?:(?:#{validDomainChars}(?:[_-]|#{validDomainChars})*)?#{validDomainChars}\.)/);
    twttr.txt.regexen.validDomainName = regexSupplant(/(?:(?:#{validDomainChars}(?:-|#{validDomainChars})*)?#{validDomainChars}\.)/);
    twttr.txt.regexen.validGTLD = regexSupplant(/(?:(?:aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|xxx)(?=[^0-9a-zA-Z@]|$))/);
    twttr.txt.regexen.validCCTLD = regexSupplant(RegExp(
        "(?:(?:ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|" +
            "ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|" +
            "ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|" +
            "ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|" +
            "na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|" +
            "sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|" +
            "ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)(?=[^0-9a-zA-Z@]|$))"));
    twttr.txt.regexen.validPunycode = regexSupplant(/(?:xn--[0-9a-z]+)/);
    twttr.txt.regexen.validDomain = regexSupplant(/(?:#{validSubdomain}*#{validDomainName}(?:#{validGTLD}|#{validCCTLD}|#{validPunycode}))/);
    twttr.txt.regexen.validAsciiDomain = regexSupplant(/(?:(?:[\-a-z0-9#{latinAccentChars}]+)\.)+(?:#{validGTLD}|#{validCCTLD}|#{validPunycode})/gi);
    twttr.txt.regexen.invalidShortDomain = regexSupplant(/^#{validDomainName}#{validCCTLD}$/);

    twttr.txt.regexen.validPortNumber = regexSupplant(/[0-9]+/);

    twttr.txt.regexen.validGeneralUrlPathChars = regexSupplant(/[a-z0-9!\*';:=\+,\.\$\/%#\[\]\-_~@|&#{latinAccentChars}]/i);
    // Allow URL paths to contain balanced parens
    //  1. Used in Wikipedia URLs like /Primer_(film)
    //  2. Used in IIS sessions like /S(dfd346)/
    twttr.txt.regexen.validUrlBalancedParens = regexSupplant(/\(#{validGeneralUrlPathChars}+\)/i);
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
                    lastUrlInvalidMatch = false,
                    asciiEndPosition = 0;
                domain.replace(twttr.txt.regexen.validAsciiDomain, function(asciiDomain) {
                    var asciiStartPosition = domain.indexOf(asciiDomain, asciiEndPosition);
                    asciiEndPosition = asciiStartPosition + asciiDomain.length;
                    lastUrl = {
                        url: asciiDomain,
                        indices: [startPosition + asciiStartPosition, startPosition + asciiEndPosition]
                    };
                    lastUrlInvalidMatch = asciiDomain.match(twttr.txt.regexen.invalidShortDomain);
                    if (!lastUrlInvalidMatch) {
                        urls.push(lastUrl);
                    }
                });

                // no ASCII-only domain found. Skip the entire URL.
                if (lastUrl == null) {
                    continue;
                }

                // lastUrl only contains domain. Need to add path and query if they exist.
                if (path) {
                    if (lastUrlInvalidMatch) {
                        urls.push(lastUrl);
                    }
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
                short_url_length: 22,
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
            // Otherwise add 22 characters
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