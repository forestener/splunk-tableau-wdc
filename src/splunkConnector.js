// Global Variables

var auth = null;
var delimiter = "[-][-][-]";
var url_dir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
var linkGen_base = url_dir + "/" + "splunk-wdc.html?query=";

// Create a Service instance via Splunk JS
function createServiceInstance() {

  // Retrieve data from UI
  var _host   	        = $('input[name="hostname"]').val();
  var _user             = $('input[name="username"]').val();
  var _pass             = $('input[name="password"]').val();
  var _schema           = $('#schema option:selected').val();
  var _management_port 	= $('input[name="management_port"]').val();

  // Create auth object
  auth = {
    host:     _host,
    username: _user,
    password: _pass,
    scheme:   _schema,
    port:     _management_port
  };

  // Create a Service instance
  // var http    = new splunkjs.JQueryHttp();
  var http = new splunkjs.ProxyHttp("/proxy");
  var service = new splunkjs.Service(http, auth);
  log(service);
  return service;
}

// Handle click event for Test Connection button
$('button[name="sh-test-connection"]').click(function(){

  // new service instance
  var service = new createServiceInstance();

  // Retrieve Splunk Version to Test Connection
  var isSuccessful = false;
  service.serverInfo(function(err, info) {
    try {
      log("Splunk Version: ", info.properties().version);
      isSuccessful = true;
      $('.connectionSuccessful').addClass('show');
      $('.connectionSuccessful').html("[-] Connected to Splunk Version: " + info.properties().version);

      // List savedSearch
      listSavedSearch(service);
      $('.connectionSuccessful').append("<br>[-] Populated SavedSearch");

      // Enable Next tab
      $("#savedsearch-spl-tab").removeClass('disabled');

      // Switch to Tab-2
      $(".nav-item > a").trigger('click');


      // Hide alert after 3s
      setTimeout(function() {
          $(".connectionSuccessful").removeClass("show");
      }, 3000);


    }
    catch(err){
      log(err);
      log('err');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
    }
  });

  // Catch jQuery POST error
  setTimeout(function(){
    if(isSuccessful == false) {
      log('Error timeout');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
      // Hide alert after 3s
      setTimeout(function() {
          $(".connectionError").removeClass("show");
      }, 3000);
    }
  }, 3000);

});

  $('button[name="sh-next"]').click(function(){
    $(".nav-link:nth-child(1)").click();
  });



(function () {
  // Create event listeners for when the user submits the form
  $(document).ready(function () {
      // Refresh SavedSearch
      $("#refreshButtonSavedSearch").click(function () {
        // new service instance
        var service = new createServiceInstance();
        listSavedSearch(service);
      });

      // Submit SavedSearch
      $("#submitButtonSavedSearch").click(function () {

        // Retrieve value of SavedSearch SPL
        var savedSearchName = $("#SavedSearchDropDown option:selected").val();
        var savedSearchSPL  = $("#SavedSearchDropDown option:selected").attr('title');

        // Generate query parameters :: base64 encoded ( compressed (params))
        var auth_str        = JSON.stringify(auth);
        var query_data      =  b64EncodeUnicode(lzw_encode(b64DecodeUnicode(savedSearchSPL) + delimiter + auth_str + delimiter + savedSearchName));

        // Show panel depicting with resulting link
        $("#panel-linkGen").addClass("show");

        // Adds link along with query infromation to  the LinkGen textarea
        $("#linkGen").html(linkGen_base + query_data);
        $("linkGen").focus();
        $("linkGen").trigger( "click" );

      });

      // Submit Custom SPL
      $("#submitButtonSPL").click(function () {

        // Copy value of SPL Textarea
        var searchQuery = $("#SPLTextArea").val();

        if(searchQuery == ""){
          $('.connectionError').html("Custom SPL Can't be empty");
          $('.connectionError').addClass('show');
          // Hide alert after 3s
          setTimeout(function() {
              $(".connectionError").removeClass("show");
          }, 3000);
        }else{
          // Generate query parameters :: base64 encoded ( compressed (params))
          var auth_str = JSON.stringify(auth);
          var query_data =  b64EncodeUnicode(lzw_encode(searchQuery + delimiter + auth_str  + delimiter + "Custom SPL"  ));

          // Show panel depicting with resulting link
          $("#panel-linkGen").addClass("show");

          // Adds link along with query infromation to the LinkGen textarea
          $("#linkGen").html(linkGen_base + query_data);
          $("#linkGen").focus();
          $("#linkGen").click();
        }
      });


      // When user clicks on linkGenerator textarea
      $("#linkGen").click(function () {
        $(this).select();
        document.execCommand("copy");
        $(this).attr('title','Copied to clipboard');
        $(this).attr('data-original-title','Copied to clipboard');

        // Test auto-redirect once link is populated with details
        // window.location.replace( $("#linkGen").val());

      });


      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      })

      // On Focus
      $("#linkGen").focus(function(){
          // Display label
          $('.linkCopiedlabel').addClass('show');

          // Hide label after 10 seconds
          setTimeout(function() {
            $('.linkCopiedlabel').removeClass('show');
          }, 10000);
      });


      // Debug selected SavedSearch
      $("#SavedSearchDropDown").change(function () {
        log($("#SavedSearchDropDown option:selected").attr('title'));
      });

      //
      $("#SearchHeadConfigButton").click(function () {
        $('#SavedSearchDropDown option:selected').attr("title");
      });


    });
})();


// Function to list all the splunk saved searches
function listSavedSearch(service){
  // List all saved searches for the current username
  var mySavedSearches = service.savedSearches();
  mySavedSearches.fetch(function(err, mySavedSearches) {
    var savedSearchColl = mySavedSearches.list();
    var $dropdownSS = $("#SavedSearchDropDown");

    log("There are " + mySavedSearches.list().length + " saved searches");
    $dropdownSS.html("");

    log(mySavedSearches.list());
    for(var i = 0; i < savedSearchColl.length; i++) {
        var search = savedSearchColl[i];

        // Polulate drop down with result of SavedSearch
        // Debug list of saved search
        log(i + ": " + search.name);
        log("  Query: " + search.properties().search + "\n");

        // Fetch earliest and latest time from Saved Search
        var earliest_time   =   search._properties["dispatch.earliest_time"].replace(/rt/g,"");
        var latest_time     =   search._properties["dispatch.latest_time"].replace(/rt/g,"");

        if(earliest_time) earliest_time = " earliest=" +  earliest_time + " ";
        if(latest_time)   latest_time = " latest="   +  latest_time + " ";

        log("Time: " + earliest_time + latest_time)

        // Build SPL form saved search and time parameters
        var _searchSPL = earliest_time + latest_time + search.properties().search;
        $dropdownSS.append($("<option />").val(search.name).text(search.name).attr( "title", b64EncodeUnicode( _searchSPL )));



    }
  });
}
