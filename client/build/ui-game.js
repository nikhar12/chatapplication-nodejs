$(document).ready(function () {
  //lis clicked for username

  //clicking on ttt boxes
  $(".gbox").click(function () {
    let boxnumber = $(this).attr("id");
    //alert(boxnumber);

    //block that box -disable click
    $(this).off("click");
  });
});
