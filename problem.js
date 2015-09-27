/*
 * This script is injected into the webpage so that it has access to MathJax
 */

var preferences;


$(document).ready(function() {

    // add a hidden <span> element to every <input> tag so that
    // by using this element, the width of the input's content
    // can be calculated (and the input's size can be changed)
    $.map($('input.codeshard'), function(n) {
        // cache the id
        var id = $(n).attr('id');

        // add the corresponding MathJax div popup (and assorted elements)
        $(n).before('<span class="MJpopup-container"><div id="' + id + 'preview" class="MJpopup"><span class="MJarrow"></span></div></span>');
        // add the corresponding hidden span
        $(n).after('<span id="' + id + 'hidden" class="codeshard-hidden" style="display: none;"></span>');

        // wrap for bracket syntax highlighting
        $(n).wrap('<div style="position: relative; display: inline-block;"></div>'
            ).after('<div id="' + id + 'highlight" class="highlight"></div>\
            <div id="' + id + 'errors" class="errors"></div>\
            ');

        // set minimum width to equal initial width
        $(n).css("min-width", $(n).width());
        $("#"+id+"highlight").css("min-width", $(n).width());   // the corresponding .highlight <div> for the white background (for some reason, only works if done separately)

    });






    // initialize preview images
    $.map($('img'), function(n) {
        // create offscreen to determine width and height
        var testImage = new Image();
        testImage.src = $(n).attr("src");

        // get the native width and height of the image
        var imageWidth = testImage.width;
        var imageHeight = testImage.height;
        // append to DOM, shift to the right and upwards a little
        $(n).before('<span class="topPopup-container"><div class="topPopup" style="width:'+imageWidth+'px; height:'+imageHeight+'px;left:'+$(n).width()/2+'px;"><img src="'+$(n).attr('src')+'"></div></span>');
    });






    // guesstimate how many questions the user got wrong
    var summary = $(".scoreSummary")[0];

    // TODO: MAKE SURE THAT IT SELECTS THE RIGHT PERCENTAGE (IT SHOULD BE THE ONE THAT SAYS "CURRENT SCORE")
    var captured = /\d+%/.exec($(summary).text());

    // if the problem has not been attempted, the percentage won't even be there, so don't check (also, it returns null, which would trigger an error later)
    if (captured !== null) {
        var percentageCorrect = captured[0].replace("%", "");
    
        var totalProblems = $(".codeshard").length;

        var problemsWrong = Math.ceil((100-percentageCorrect) / 100 * totalProblems);
    
        $(summary).children().html("I estimate that you answered <b>" + (problemsWrong == 0 ? "zero" : problemsWrong) + "</b> question" + (problemsWrong == 1 ? "" : "s") + " incorrectly.<br>" + $(summary).children().html());
    }






    /*
     * When the value inside an answer box changes, calculate the length
     * by getting the length of the hidden <span>, and use that to increase
     * the size of the input box if it doesn't fit
     */
    $('input.codeshard').on('input', function(e) {

        // cache id
        var id = e.target.id;
        // and cache element's content
        var value = $(this).val();

        // insert the input text into the hidden <span>
        // replace spaces with non-breaking spaces to prevent any of the input from being cut off
        // TODO: get rid of hidden div?  Bracket highlighting could serve the same role
        $('#' + id + 'hidden').text(value.replace(/ /g, '\u00a0'));

        // calculate the length of this text
        var length = $('#' + id + 'hidden').width();

        // set width of the input box to the hidden <span> width
        // also set width of the corresponding .highlight <div> to get a white background
        // multiply by 1.05 because preview width seems to be messed up somewhere
        $(this).css('width', length*1.05+'px');
        $('#' + id + 'highlight').css('width', (length+10)+'px');   // needs to be done separately because of separate length

        /*
         * Convert the input value into TeX code
         */

        // ignore input with insufficient characters

        // cache value of the preview div
        var previewDiv = $('#' + id + 'preview');

        if (value.length < 3) {
            // empty the preview div to prevent ugly markup rendering
            previewDiv.empty();

            // also, hide it
            previewDiv.animate({opacity: 0}, 200);

        } else if (preferences.mathjax) {   // only execute if mathjax is enabled in the options menu


            // convert the input into TeX notation
            value = toTeX(value);

            // if the preview div was EMPTY BEFORE NOW, then reveal it (also, don't show them when the event is initially triggered when the page first loads)
            if (previewDiv.text().length == 0 && e.originalEvent !== undefined) {
                previewDiv.animate({opacity: 1}, 200);
            }

            // add on the slashes and brackets to the sides and append to the DOM if it is long enough
            previewDiv.text("\\[ " + value + " \\]");

            // format the corresponding preview div (and ONLY that div)
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, id+"preview"], function() { // TODO: put callback script in function and execute on window resizes?
                // on the callback, check the element's width (if it is large enough, change the class)
                var width = previewDiv.width();
                // get the width between the element and the window edge
                var offset = $(e.target).offset().left;

                if (offset < width+40) {
                    previewDiv.removeClass("MJpopup").addClass("MJpopup-bottom");
                } else if (offset - 140 > width) { // don't execute right away - makes it smoother for quick edits
                    previewDiv.removeClass("MJpopup-bottom").addClass("MJpopup");
                }
            });
            
        }

    });


    // generate mathjax previews (which stay hidden) for input boxes - also expands input box size if contents are too large
    $('input.codeshard').trigger("input");



    /*
     * When the cursor position is changed, then highlight
     * the brackets of the input based on the enabled setting
     */
    $('input.codeshard').on('input keydown focus click', function(e) {

        // highlight brackets if the preference is enabled
        if (preferences.highlighting !== 0)
            highlightBrackets(e.target.id, preferences.highlighting);
        
    });






    /*
     * When an input is focused, show the corresponding preview div
     * Opacity is animated because animating show() causes issues with the popup sticking off the edge of the screen
     */
    $('input.codeshard').focus(function(e) {
        var value = $(this).val();
        // only show if there is some text in the input field
        if (value.length >= 3) {   // slightly differnet from the similar code above
            $('#' + e.target.id + 'preview').show().animate({opacity: 1}, 200);
        }
            
    });
    // and hide when unfocused
    $('input.codeshard').blur(function(e) {
        $('#' + e.target.id + 'preview').animate({opacity: 0}, 200, function() {
            $('#' + e.target.id + 'preview').hide();
        });

        // remove all bracket highlighting
        $('#' + e.target.id + 'highlight').text("");
        $('#' + e.target.id + 'errors').text("");
    });


    /*
     * When hovering over images, show a popup with a
     * larger version of the image in question
     */
    $('img').mouseenter(function() {
        $(this).prev().children().stop().css("display", "inline-block").animate({opacity: 1}, 200); // .css instead of .show because it changes style to block instead, which messes with alignment
    });
    $('img').mouseleave(function() {
        // hide element
        $(this).prev().children().stop().animate({opacity: 0}, 200, function () {
            $(this).hide();
        });
    });



    /*
     * Highlights the brackets of the input box
     * example id: "AnSwEr0001"
     */
    function highlightBrackets(id, mode) {
        // mode 1 = all blue highlighting of one bracket
        // mode 2 = rainbow highlighting of one bracket
        // mode 3 = rainbow highlighting of all brackets
        var string = $("#"+id).val();

        // timeout because otherwise clicking on the input will return 0
        setTimeout(function() {

        // get position of cursor within input field
        var caret = document.getElementById(id).selectionStart;
        
        // keep track of brackets
        var brackets = [];

        // initialize previous object
        var previous = {pos:0, type:' '};

        // keep track of current depth
        var depth = 0;
        
        for (var i = 0; i < string.length; i++) {
            var char = string.charAt(i);

            if (char === "(" || char === "[" || char === "{") {

                // update the value of previous
                previous = {pos:i, type:char};
                brackets.push(previous);
                depth++;

            } else if (char === ")" || char === "]" || char === "}") {

                depth--;

                if (brackets.length > 0)
                    previous = brackets[brackets.length-1];
                else
                    previous = {pos:0, type:' '};


                
                // check if the previous bracket matches
                if (Math.abs(char.charCodeAt() - previous.type.charCodeAt()) > 2) {
                    // error
                    string = string.substr(0, previous.pos) + '<span class="syntaxError">' + string.substr(previous.pos, i - previous.pos+1) + '</span>' + string.substr(i+1);


                    // empty brackets to prevent the "MISSING CLOSING BRACKET" section from highlighting additional parentheses
                    brackets = [];
                    break;
                }

                // add span encasing them
                if (mode === 3) {  // highlight brackets and contents
                    string = string.substr(0, previous.pos) + '<span value="'+depth%5+'">' + string.substr(previous.pos, i - previous.pos+1) + '</span>' + string.substr(i+1);
                    // increment i ("<span></span>" is 11 characters)
                    i += 11+10;
                } else if (i >= caret && previous.pos < caret) {   // only highlight brackets
                    var spanValue;
                    if (mode === 1)
                        spanValue = -1; // default color is light blue
                    else if (mode === 2)
                        spanValue = depth%5; // taste the rainbow

                    string = string.substr(0, previous.pos) + '<span value="'+spanValue+'">' + string.substr(previous.pos, 1) + '<span class="translucent">' + string.substr(previous.pos+1, i - previous.pos-1) + '</span>' + string.substr(i, 1) + '</span>' + string.substr(i+1);
                    brackets = [];
                    break;
                }
                
                // remove the previous opening bracket from the array
                brackets.pop();
                    
            } else if (char === "|") { // deal with pipes separately TODO: check for syntax errors

                if (brackets.length > 0)
                    previous = brackets[brackets.length-1];
                else
                    previous = {pos:0, type:' '};

                var prevChar = string.charAt(i-1);
                if (prevChar === "+" || prevChar === "-" || prevChar === "*" || prevChar === "/" || prevChar === "^" || prevChar === "" || previous.type !== "|") {
                    // update the value of previous
                    previous = {pos:i, type:"|"};
                    brackets.push(previous);
                    depth++;
                } else {
                    depth--;
                    if (mode === 3) {
                        string = string.substr(0, previous.pos) + '<span value="'+depth%5+'">' + string.substr(previous.pos, i - previous.pos+1) + '</span>' + string.substr(i+1);                        i += 11+10;
                    } else if (i >= caret && previous.pos < caret) {
                        var spanValue;
                        if (mode === 1)
                            spanValue = -1;
                        else if (mode === 2)
                            spanValue = depth%5;

                        string = string.substr(0, previous.pos) + '<span value="'+spanValue+'">' + string.substr(previous.pos, 1) + '<span class="translucent">' + string.substr(previous.pos+1, i - previous.pos-1) + '</span>' + string.substr(i, 1) + '</span>' + string.substr(i+1);
                        brackets = [];
                        break;
                    }
                    brackets.pop();
                }
            }

        }

        // if the array isn't empty, then there is a bracket mismatch problem
        if (brackets.length) {
            var previous = brackets[brackets.length-1];
            string = string.substr(0, previous.pos) + '<span class="syntaxError">' + string.substr(previous.pos) + '</span>';
        }


        $("#"+id+"highlight").html(string);
        $("#"+id+"errors").html(string);

        //console.log(string);

        }, 10);
    }   // highlight brackets end



    // load preferences, and disable unwanted options
    loadPreferences();

});



function loadPreferences() {
    if (typeof preferences !== "undefined") {
        // preferences has been loaded
        if (preferences.mathjax === false) {
            // disable the focus and unfocus events

            $('input.codeshard').off("focus");
        }
            
    } else {
        setTimeout(function(){
            loadPreferences();
        },300);
    }
}


/*
 * Converts a string into valid TeX
 * notation (used for input values)
 */
function toTeX(string) {

    // first, bracket numbers, variables, and parentheses for easy identification later

    // add spaces to beginning and end to make sure variable regex capture works
    string = " " + string + " ";

    // replace curly brackets "{}" with regular brackets "()" because it interferes with TeX notation
    string = string.replace(/\{/g, "(").replace(/\}/g, ")");

    string = string.replace(/((([^\d\)\]])(-))?(\d+(\.\d+)?))/g, "$3{$4$5}");   // numbers (includes support for negative numbers)
    
    // variables (todo: optimize)
    for (var i = 0; i < string.length; i++) {
        if (/[a-z]/i.exec(string.charAt(i))) {   // if letter
            // preceding character must not be a letter
            if (i != 0) {
                if (/[a-z]/i.exec(string.charAt(i-1)))   // previous character can't be alphabetical
                    continue;
            }
            if (i < string.length-1)
                if (/[a-z]/i.exec(string.charAt(i+1)))   // next character can't be alphabetical
                    continue;
            // if still here, must be a valid variable
            string = string.substr(0, i) + "{" + string.substr(i, 1) + "}" + string.substr(i+1);
            i += 3; // add two brackets to the string, and next character already proven to not be alphabetic
        }
    }


    string = string.replace(/(\(|\[)/g, "{$1").replace(/(\)|\])/g, "$1}");  // () & [] (NOT {})

    // pi
    string = string.replace(/(pi|π)/g, "{π}");

    // escape functions (ex. sin, abs, ln, etc)
    string = escapeOperation("sqrt", string);
    string = escapeOperation("sin", string);
    string = escapeOperation("cos", string);
    string = escapeOperation("tan", string);
    string = escapeOperation("sec", string);
    string = escapeOperation("csc", string);
    string = escapeOperation("cot", string);
    string = escapeOperation("arcsin", string);
    string = escapeOperation("arccos", string);
    string = escapeOperation("arctan", string);
    string = escapeOperation("log", string);
    string = escapeOperation("ln", string);

    // replace "abs(x)" and "|x|" with escaped pipes
    string = escapeABS(string);

    // replace "**" with carets "^"
    string = string.replace(/\*\*/g, "^");

    // get rid of all spaces (which should be between brackets
    string = string.replace(/ /g, "");

    // TODO: functions (cos, sin, abs, etc)
    //string = string.replace(/([A-Za-z]+{)/g, "\\$1");

    // "}{" means multiplication
    string = string.replace(/}{/g, "}*{");

    var brackets = [];


    

    for (var n = 0; n < 50; n++) {

    // check if any changes were made on a given iteration
    var changesMade = false;

    // how many layers of brackets deep the loop is
    var depth = 0;
    // find brackets
    for (var i = 0; i < string.length; i++) {   // look for opening brackets
        if (string.charAt(i) === "{") {
            if (brackets[depth] === undefined) {
                brackets[depth] = [];
            }
            // push the parenthese location on
            brackets[depth].push(i);
            // dive in deeper
            depth++;
            
        } else if (string.charAt(i) === "}") {  // look for closing brackets
            // dive outward
            depth--;
            // check for errors
            if (depth < 0)
                break;
            // add the bracket on
            brackets[depth].push(i);
            
            // if there are two or more sets at the layer, look for some certain functions
            var length = brackets[depth].length;
            if (brackets[depth].length >= 4) {

                var firstBegin = brackets[depth][length-4];
                var firstEnd = brackets[depth][length-3];
                var secondBegin = brackets[depth][length-2];
                var secondEnd = brackets[depth][length-1];

                var first = string.substr(firstBegin, firstEnd-firstBegin+1);
                var second = string.substr(secondBegin, secondEnd-secondBegin+1);
                // look at what is in between the two bracket groups
                var middle = string.substr(firstEnd+1, secondBegin-firstEnd-1);

                /*
                 * Where the real magic happens
                 */

                // check the middle for any...brackets (if there are, the capture group isn't valid, so skip to next one)
                if (/{|}/.test(middle)) {
                    continue;
                }

                var start = "", end = "";


                // test for exponents
                if (/\^/.test(middle)) {
                    start = "{";
                    end = "}";
                    middle = "©";   // substitute character for "^", is converted back later

                    string = string.substr(0, firstBegin) + start + string.substr(firstBegin, firstEnd-firstBegin+1) + middle +  string.substr(secondBegin, secondEnd-secondBegin+1) + end + string.substr(secondEnd+1);
                    changesMade = true;
                    break;
                }
                // test for fractions
                else if (/\//.test(middle)) {
                    start = "\\frac";
                    end = "";
                    middle = "";
                    string = string.substr(0, firstBegin) + start + string.substr(firstBegin, firstEnd-firstBegin+1) + middle +  string.substr(secondBegin, secondEnd-secondBegin+1) + end + string.substr(secondEnd+1);
                    changesMade = true;
                    break;
                }

                
            } // end of looking at a bracket pair
            
        }
    }
    // if no changes were made, exit
    if (!changesMade)
        break;

    brackets = [];
    }

    // now apply some last minute formatting

    // replace "©"" with "^"
    string = string.replace(/\u00A9/g, '\u005E');

    // replace "ƒ" with "\\frac"
    string = string.replace(/\u0192/g, "\\frac");

    // remove ALL spaces
    string = string.replace(/ +/g, "");

    // format parentheses so that they are sized properly (unfortunately have to do this at the end instead of earlier when targeting brackets)
    string = string.replace(/(\(|\[)/g, "\\left$1");
    string = string.replace(/(\)|\])/g, "\\right$1");
    
    return string;
}




// convert functions to TeX notation
function escapeOperation(name, string) {
    var regex = new RegExp("("+name+"){", "g");

    //string = string.replace(regex, "\\$1{");
    var nextMatch = string.indexOf(name, 0);

    // replace all instances
    while(nextMatch !== -1) {
        // find the closing bracket of the content
        var depth = 0;

        // check the string until you find the end of the contained value of the math function

        for (var i = nextMatch; i < string.length; i++) {
            if (string.charAt(i) === "{")
                depth++;
            else if (string.charAt(i) === "}") {
                depth--;
                if (depth < 0)
                    return -1;  // error
                else if (depth === 0) { // found the end of the brackets
                    // make the new string
                    string = string.substr(0, nextMatch) + "{\\" + string.substr(nextMatch, i-nextMatch+1) + "}" + string.substr(i+1);
                    break;
                }
            }
        }
        nextMatch = string.indexOf(name, nextMatch+5);

    }

    // find occurences of the string
    return string;
}



/*
 * Properly escapes absolute value pipes "|",
 * and converts "abs()" into a function
 */
function escapeABS(string) {

    var nextMatch = string.indexOf("abs", 0);

    // replace all instances
    while(nextMatch !== -1) {
        // find the closing bracket of the content
        var depth = 0;

        // check the string until you find the end of the contained value of the math function
        for (var i = nextMatch+3; i < string.length; i++) {

            if (string.charAt(i) === "{")
                depth++;
            else if (string.charAt(i) === "}") {
                depth--;
                if (depth < 0) {
                    throw {};
                    return -1;
                }
                else if (depth === 0) { // found the end of the brackets
                    // make the new string
                    string = string.substr(0, nextMatch) + "{\\left\\lvert{" + string.substr(nextMatch+5, i-nextMatch-6) + "}\\right\\rvert}" + string.substr(i+1);
                    break;
                }
            }
        }
        nextMatch = string.indexOf("abs", nextMatch+5);

    }

    // properly escape absolute value pipes (based on code for highlighting pipes), because the old regex method was not always successful
    var depth = 0;
    var previous = {pos:0, type:" "};
    var brackets = [];
    for (var i = 0; i < string.length; i++) {
        if (string.charAt(i) === "|") {

            if (brackets.length > 0)
                previous = brackets[brackets.length-1];
            else
                previous = {pos:0, type:" "};

            var prevChar = string.charAt(i-1);
            if (prevChar === "+" || prevChar === "-" || prevChar === "*" || prevChar === "/" || prevChar === "^" || prevChar === "" || previous.type !== "|") {
                // update the value of previous
                previous = {pos:i, type:"|"};
                brackets.push(previous);
                depth++;
            } else {
                depth--;
                string = string.substr(0, previous.pos) + '{\\left\\lvert{' + string.substr(previous.pos+1, i-previous.pos-1) + '}\\right\\rvert}' + string.substr(i+1);
                i += 26;
                brackets.pop();
            }
        }
    }

    // find occurences of the string
    return string;

}