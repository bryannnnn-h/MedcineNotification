//popWindow
var scrollDist;
var myTop;
var myLeft;

function centerHandler(){
  scrollDist=$(window).scrollTop();
  myTop=($(window).height()-$("#popWindow").height())/2+scrollDist;
  myLeft=($(window).width()-$("#popWindow").width())/2;
}

function warning(button_value){
    centerHandler ();
    $('#hide').css('display','block');
    $('#popWindow').css('display','flex');
    $('body').css('overflow','hidden');
    $('#popWindow').offset({top: myTop,left:myLeft}); 
    $('#popWindow').animate({
        opacity: '1',
      },500,'linear');
    $("#delete").attr('value', button_value);  
  }
  
  function cancel(){
    $('body').css('overflow','scroll');
    $('#hide').css('display','none');
    $('#popWindow').css('opacity','0');
    $('#popWindow').css('display','none');	
  }
  //------------------------------------------------------------