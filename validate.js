/*
 * jQuery Validation plugin setup for create_cm_form and update_cm_form, see more at http://jqueryvalidation.org/
 */

/*
* Work around for happening select fields due to trouble integrating jQuery Validation
* Simply present custom error text if there are no locations entered
*/
function validateHappening() {
    var empty = true;
    $(".happening").each(function() {
        if ($.trim($(this).val()).length) {
            empty = false;
            return false; //break
        }
    });
    if (empty) {
        $("#happening_error").removeClass("hidden-force");
        return false;
    } else {
        $("#happening_error").addClass("hidden-force");
        return true;
    }
}

function validateCustomNotifications() {
    var valid = true;
    var allValid = true;
    var customNotificationTopicsPresent = false;

    $(".cm-custom-notification-select").each(function(){
        valid = true;
        if($(this).val() != null) {
            $.each($(this).val(),function(index, value){
                customNotificationTopicsPresent = true;
                if(!VALID_REGION_ARN_REGEX.test(value)) {
                    valid = false;
                    return false; //break
                }
            })

            $("#sns_permissions_info").removeClass("hidden-force");
        }

        if(valid == false) {
            $(this).siblings("label").removeClass("hidden-force")
            allValid = false;
        } else {
            $(this).siblings("label").addClass("hidden-force")
        }

    });

    if (!customNotificationTopicsPresent) {
        $("#sns_permissions_info").addClass("hidden-force");
    }

    return allValid;
}

/*
* Work around for cti select fields due to trouble integrating jQuery Validation
* Simply present custom error text if a cti select field is empty
*/
function validateCTI() {
    var valid = true;
    $(".cti-select").each( function () {
        if(!$(this).val()) {
            valid = false;
            return false; //break
        }
    });
    if (valid) {
        $("#cti_error").addClass("hidden-force");
    } else {
        $("#cti_error").removeClass("hidden-force");
    }
    return valid;
}

/*
 * Validates the form by validating each individual section
 * return {boolean} valid -> submit form, invalid -> jump to first invalid section
 */
function validateCmForm() {
    var invalidSectionId;
    $(".validation-section").each(function() {
       if ($(this).parent().attr("id") === "cm-preflight-step-fields") {
            if (!validatePreflightSteps(false)) {
                if (isNullOrUndefined(invalidSectionId)) {
                    invalidSectionId = "#cm-preflight-step-fields";
                }
            }
        } else if ($(this).parent().attr("id") === "cm-step-fields") {
            if (!validateSteps(false)) {
                if (isNullOrUndefined(invalidSectionId)) {
                    invalidSectionId = "#cm-step-fields";
                }
            }
       } else if ($(this).parent().attr("id") === "cm-custom-field-fields") {
           if (!validateCustomFields(false)) {
               if (isNullOrUndefined(invalidSectionId)) {
                   invalidSectionId = "#cm-custom-field-fields";
               }
           }
       } else if (!validateCmSection($(this))) {
            if (isNullOrUndefined(invalidSectionId)) {
                invalidSectionId = "#" + $(this).parent().attr("id");
            }
       }
    });

    if (isNullOrUndefined(invalidSectionId)) {
        return true;
    } else {
        document.location.href = invalidSectionId;
        return false;
    }
}

/*
 * Validate a Cm Section by validating each validatable element
 * If valid -> apply valid styling, invalid -> apply invalid styling
 * param  {jQuery Object} section, Section to be validated
 * return {boolean} valid, Is section valid
 */
function validateCmSection(section) {
    var valid = true;
    var parentId = $(section).parent().attr("id");
    if (parentId === "cm-happening-fields") {
        valid = validateHappening();
    } else if (parentId === "cm-preflight-step-fields") {
        valid = validatePreflightSteps(true);
    } else if (parentId === "cm-step-fields") {
        valid = validateSteps(true);
    } else if (parentId === "cm-custom-field-fields") {
        valid = validateCustomFields(true);
    } else if(parentId ==="cm-custom-notification-fields") {
        valid = validateCustomNotifications();
    }
    else {
        $(section).find(".validate").each(function() {
            if (!$(".validated_form").validate().element($(this))) {
                valid = false;
            }
        });
    }

    //Seperated out from if/else block because cm-ownership-fields also contains ".validate" elements
    if (parentId === "cm-ownership-fields") {
        valid = valid && validateCTI();
    }

    if (valid) {
        setSectionToValid(section)
    } else {
        setSectionToInvalid(section);
    }
    return valid;
}
/**
 * Resets the validation on the create cm form. The steps are:
 *   1. Go through each validation section and reset the styling
 *   2. Reset the jquery validation plugin
 */
function resetCreateCmFormValidation() {
    $(".validation-section").each(function() {
        $(this).removeClass("valid_element invalid_element active_element");
        $(this).find(".white-checkmark").addClass("display-none");
        $(this).find(".white-x").addClass("display-none");
        $("#create_cm_form").validate().resetForm();
    });
}

function initCmFormValidation() {
    $(".validation-section").focusout(function() {
        var section = $(this);
        //Timeout is necessary because focus momentarily switches to body on each focus change
        setTimeout(function() {
            //Blacklist to not perform validation on foucs change to: element in same section, any date picker elements
            if (!$.contains(section[0], document.activeElement) && !$.contains($("#ui-datepicker-div")[0], document.activeElement)) {
                validateCmSection(section);
            }
        }, 100);
    });

    /*
     * The datepicker element is placed at the bottom of the DOM
     * Since the datepicker element only exists in the cm-mains-fields section,
     *  give it necessary behavior of an element in that section
     */
    $("#ui-datepicker-div").focusout(function() {
    $("#cm-main-fields .validation-section").focusout();
    });

    $("#ui-datepicker-div").focusin(function() {
        $("#cm-main-fields .validation-section").focusin();
    });

    $(".happening").change(function() {
	//Timeout is necessary because focus momentarily switches to body on each focus change
	setTimeout(function() {
	    if(!$.contains($("#cm-happening-fields")[0], document.activeElement)) {
	        validateCmSection($("#cm-happening-fields .validation-section"));
	    }
	}, 100);
    });

    var form_validation_options = {
        onsubmit: false,
        ignore: [], //Allow validation on hidden fields. Needed because step fields are hidden upon form validation
        rules: {
            //Require a radio button
            business_impact: {
                required : true
            },
            scheduled_start: {
               required : "#auto_calc_scheduled_end:unchecked"
            },
            scheduled_end: {
               required : "#auto_calc_scheduled_end:unchecked"
            },
            lifecycle: {
                required: regionSupportsLifecycleToggle()
            }
        },
        messages: {
            scheduled_start: {
                required : "Scheduled Start is required"
            },
	    scheduled_end: {
                required : "Scheduled End is required"
            }
        },
        errorPlacement: function(error, element) {
            if (element.attr("name") === "business_impact") {
                //Move location of error message to after last button
                $("#business_impact_radio_buttons").append(error);
            } else if (element.attr("name") === "lifecycle") {
                $("#cm-lifecycle-error-container").append(error);
            } else {
                switch(element.attr("id")) {
                    case "requester":
                        $("#requester-error-container").append(error);
                        break;
                    case "technician":
                        $("#technician-error-container").append(error);
                        break;
                    case "scheduled_end":
                        $("#scheduled-end-error-container").append(error);
                        break;
                    case "scheduled_start":
                        $("#scheduled-start-error-container").append(error);
                        break;
                    case "title":
                        $("#cm-title-error-container").append(error);
                        break;
                    case "step_title":
                        $("#step-title-error-container").append(error);
                        break;
                    case "scheduled_end_copy":
                        $("#scheduled-end-copy-error-container").append(error);
                        break;
                    case "auto_calc_scheduled_end":
                        $("#auto-calc-scheduled-end-error-container").append(error);
                        break;
                    default:
                        error.insertAfter(element);
                }
            }
        }
    }
    return form_validation_options;
}

function initCreateCmFormValidation() {
    var form_validation_options = initCmFormValidation();
    $("#create_cm_form").validate(form_validation_options);
}

function initEditCmFormValidation() {
    var form_validation_options = initCmFormValidation();
    $("#update_cm_form").validate(form_validation_options);
}

;
