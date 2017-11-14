/*
 * This script runs on the ASSIGNMENT PAGE of WeBWorK.  It colors in the
 * table cells based on how much of the problem the student got correct.
 */
var TIME_WARNING = 3600*24*2; // 2 days
var TIME_FLASHING = 3600*12; // 12 hours

$(document).ready(function() {

    // add a countdown timer
    var curdate = Date.now();
    $(".page-title").each(function() {
        var text = $(this).text();

        // search for a date
        if (text.search(/\d{2}\/\d{2}\/\d{4}/) !== -1) {
            // give it position: relative so that the timer sticks to it correctly
            $(this).css("position", "relative");

            // found a valid date!
            // get the components
            var regex = /(\d{2})\/(\d{2})\/(\d{4}).+(\d{2}):(\d{2})(\w{2})/
            var match = regex.exec(text);

            // construct a Date object using the matches
            var duedate = new Date(parseInt(match[3], 10), parseInt(match[1]-1, 10), parseInt(match[2], 10), ((match[6] === "pm") ? parseInt(match[4])+12 : parseInt(match[4])), parseInt(match[5]));

            var remainingTime = Math.floor((duedate - curdate) / 1000); // in seconds

            if (remainingTime > 0) {
                // only apply the below if the assignment is open

                // add a timer <span>, which has the duedate countdown saved to it (measured in seconds)
                // also save the exact time the assignment is due, in seconds past epoch
                $("<span/>", {"class": "timer-hidden"}).data("seconds", remainingTime).data("duedate", Math.floor(duedate/1000)).appendTo($(this));
            }
            incrementTimer(this);
        }
    });

    /*
     * Since the timer doesn't execute when the tab is not visible,
     * the page detects when it regains focus and updates the timer
     * so that the countdowns remain accurate
     */
    document.addEventListener("visibilitychange", function() {
      if (!document.hidden) { // the tab with WeBWorK in it has regained focus and is no longer hidden
        // update timers
        var curtime = Math.floor(Date.now() / 1000); // the new current time, in seconds past epoch
        $(".timer-hidden").each(function() {
          $(this).data("seconds", $(this).data("duedate") - curtime); // calculate the new amount of time remaining
        });
      }
    }, false);

    // update times
    window.setInterval(function(){
        // get the corresponding table rows
        $(".timer-hidden").each(function() {
            incrementTimer(this);
        });
    }, 1000);


    /*
     * Sets a timer to the correct time
     * used when timer is first created and
     * when the tab is focused on again
     * after being hidden
     */
    function setTimer(element) {
      console.log(element.parent());
    }


    /*
     * Displays the time remaining before an open assignment is due
     */
    function incrementTimer(element) {
            // check if it has a timer attached
            var time = $(element).data("seconds");
            if (typeof time === "number") {
                time--;

                if (time < 0) {
                    // delete the timer, it is no longer needed
                    $(element).remove();
                } else {
                    $(element).data("seconds", time);
                    if (time > 3600*24) {
                        // more than 1 day remaining
                        var days = Math.floor(time/3600/24);
                        $(element).text(days + (days == 1 ? " day" : " days"));
                    } else {
                        // less than one day remaining
                        var hours = "00"+Math.floor(time/3600);
                        time -= hours*3600;
                        var minutes = "00"+Math.floor(time/60);
                        time -= minutes*60;
                        var seconds = "00"+Math.floor(time);
                        // display the remaining time (in the form hh : mm : ss)
                        $(element).text(hours.substr(hours.length-2) + " : " + minutes.substr(minutes.length-2) + " : " + seconds.substr(seconds.length-2));
                    }
                }
            }
    }

    function drawGradients() {
        // get offset of table
        var table = $(".problem_set_table")[0];

        if (table === undefined) {      // on some pages (like the login page), the table won't be present
            $(window).off("resize");    // detatch event to prevent it from being triggered again
            return false;
        }

        // some values that are useful to cache:
        var table_padding = parseInt($(".problem_set_table td").first().css("padding").replace(/\D/g, "")) * 2; // add to width of table to get correct gradient


        // get percentage that
        $.map($(".problem_set_table tr:not(:first-child)"), function(n) {
            // first, get the offset from the left side of the screen, in px
            var rect = n.getBoundingClientRect();
            var width = $(n).width()+table_padding;
            // calculate position of the stop, in px
            var percentage = parseInt($(n).children().last().text().replace("%", ""), 10);
            var separation = Math.ceil(width*percentage/100 + rect.left);

            // style the gradient based on how much is complete
            if (percentage === 100) {
                n.style.background = "#dff0d8"; // 100% = all green
            } else if (percentage === 0) {
                n.style.background = "#f2dede"; // 0% = all red
            } else {
                // n.style.background = "linear-gradient( to right, #dff0d8, #dff0d8 "+separation+"px, #f2dede "+separation+"px, #f2dede 1600px) fixed";
                n.style.background = "#fcf8e3";
            }
        });
    }

    /*
     * when window is resized, recalculate the
     * gradient on the table so that it stays accurate
     */
    $(window).resize(drawGradients());
    // setTimeout(function(){ $(window).trigger("resize"); }, 100);
    drawGradients();


});