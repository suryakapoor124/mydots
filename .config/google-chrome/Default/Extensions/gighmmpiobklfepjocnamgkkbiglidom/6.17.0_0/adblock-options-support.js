/*
 * This file is part of AdBlock  <https://getadblock.com/>,
 * Copyright (C) 2013-present  Adblock, Inc.
 *
 * AdBlock is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * AdBlock is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdBlock.  If not, see <http://www.gnu.org/licenses/>.
 */

/* For ESLint: List any global identifiers used in this file below */
/* global browser, selected, browser, determineUserLanguage, initializeProxies, send */

$(async () => {
  await initializeProxies();

  const resetCheckmark = function () {
    $("#checkmark-circle-checkmark").removeClass("checkmark").removeClass("draw");
    $("#checkmark-circle").removeClass("checkmark-circle").addClass("do-not-display");
    $("#checkmark-circle").css("display", ""); // remove the "display: none;" style property that was set during fadeOut()
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if ($("#support").is(":visible") && mutation.attributeName === "style") {
        resetCheckmark();
        $("#btnCopyDebugData").removeClass("green").addClass("red");
        $("#copiedDebugData").addClass("do-not-display");
        $("#copyDebugData").show();
      }
    }
  });

  const target = document.querySelector("#support");
  observer.observe(target, {
    attributes: true,
  });

  if (!determineUserLanguage().startsWith("en")) {
    $(".english-only").removeClass("do-not-display");
  }
  // Show debug info
  let debugInfo = null;
  const showDebugInfo = function () {
    $("#debugInfo").text(debugInfo).fadeIn();
    document.getElementById("debugInfo").select();
    document.execCommand("copy");
    $("#btnCopyDebugData").addClass("green").removeClass("red");
    $("#checkmark-circle-checkmark").addClass("checkmark").addClass("draw");
    $("#checkmark-circle").addClass("checkmark-circle").removeClass("do-not-display");
    $("#copyDebugData").hide();
    $("#copiedDebugData").removeClass("do-not-display");
    setTimeout(() => {
      $("#checkmark-circle").fadeOut(400, () => {
        resetCheckmark();
      });
    }, 2500);
  };
  selected("#btnCopyDebugData", async () => {
    // Get debug info
    const theDebugInfo = await send("getDebugInfo");
    const content = [];
    if (theDebugInfo.subscriptions) {
      content.push("=== Filter Lists ===");
      for (const sub in theDebugInfo.subscriptions) {
        content.push(`Id:${sub}`);
        content.push(`  Download Status: ${theDebugInfo.subscriptions[sub].downloadStatus}`);
        content.push(`  Last Download: ${theDebugInfo.subscriptions[sub].lastDownload}`);
        content.push(`  Last Success: ${theDebugInfo.subscriptions[sub].lastSuccess}`);
      }
    }

    content.push("");

    if (theDebugInfo.exclude_filters) {
      content.push("=== Exclude Filters ===");
      content.push(JSON.stringify(theDebugInfo.exclude_filters));
    }
    // Custom & Excluded filters might not always be in the object
    if (theDebugInfo.customFilters) {
      content.push("=== Custom Filters ===");
      content.push(theDebugInfo.customFilters);
      content.push("");
    }

    content.push("=== Settings ===");
    for (const setting in theDebugInfo.settings) {
      content.push(`${setting} : ${theDebugInfo.settings[setting]}`);
    }

    content.push("");
    content.push("=== Other Info ===");
    content.push(JSON.stringify(theDebugInfo.otherInfo, null, "\t"));

    content.push("");
    content.push("=== IPM Info ===");
    content.push(JSON.stringify(theDebugInfo.ipmInfo, null, "\t"));

    // Put it together to put into the textbox
    debugInfo = content.join("\n");

    if (
      browser.runtime.getManifest().optional_permissions &&
      browser.runtime.getManifest().optional_permissions.includes("management")
    ) {
      browser.permissions
        .request({
          permissions: ["management"],
        })
        .then((granted) => {
          // The callback argument will be true if the user granted the permissions.
          if (granted) {
            // since the management.getAll function is not available when the page is loaded
            // the function is not wrapped by the polyfil Promise wrapper
            // so we create, and load a temporary iFrame after the permission is granted
            // so the polyfil will correctly wrap the now available API
            const iframe = document.createElement("iframe");
            iframe.onload = () => {
              const proxy = iframe.contentWindow.browser;
              proxy.management.getAll().then((result) => {
                const extInfo = [];
                extInfo.push("==== Extension and App Information ====");
                for (let i = 0; i < result.length; i++) {
                  extInfo.push(`Number ${i + 1}`);
                  extInfo.push(`  name: ${result[i].name}`);
                  extInfo.push(`  id: ${result[i].id}`);
                  extInfo.push(`  version: ${result[i].version}`);
                  extInfo.push(`  enabled: ${result[i].enabled}`);
                  extInfo.push(`  type: ${result[i].type}`);
                  extInfo.push("");
                }

                debugInfo = `${debugInfo}  \n\n${extInfo.join("  \n")}`;
                showDebugInfo();
                browser.permissions.remove({ permissions: ["management"] });
                document.body.removeChild(iframe);
              });
            };
            iframe.src = browser.runtime.getURL("proxy.html");
            iframe.style.visibility = "hidden";
            document.body.appendChild(iframe);
          } else {
            debugInfo += "\n\n==== User Denied Extension and App Permissions ====";
            showDebugInfo();
          }
        });
    } else {
      debugInfo += "\n\n==== No Extension and App Information ====";
      showDebugInfo();
    }
  });

  // Show the changelog
  selected("#whatsnew_link", () => {
    fetch(browser.runtime.getURL("RELEASE_NOTES.md"))
      .then((response) => response.text())
      .then((text) => {
        const unreleasedSection = "# Unreleased";
        let cleanedText = text;

        if (text.startsWith(unreleasedSection)) {
          const firstReleaseIndex = text.indexOf("#", unreleasedSection.length);
          if (firstReleaseIndex !== -1) {
            cleanedText = text.slice(firstReleaseIndex);
          }
        }

        $("#changes").text(cleanedText).fadeIn();
        $("body, html").animate(
          {
            scrollTop: $("#changes").offset().top,
          },
          1000,
        );
      });
  });
});
