function Nav_mine_animate(){
    $('.page_of_supervisee').css('color','#c4c4c4');
    $('#page_of_supervisee').css('background-color','white');
    $('.page_of_supervisor').css('color','#27ae60');
    $('#page_of_supervisor').css('width','0');
    $('#page_of_supervisor').css('background-color','#27ae60');
    $('#page_of_supervisor').animate({ width:'50vw'})        
}

function Nav_contactor_animate(){
    $('.page_of_supervisor').css('color','#c4c4c4');
    $('#page_of_supervisor').css('background-color','white');
    $('.page_of_supervisee').css('color','#27ae60');
    $('#page_of_supervisee').css('width','0');
    $('#page_of_supervisee').css('background-color','#27ae60');
    $('#page_of_supervisee').animate({ width:'50vw' })    
}