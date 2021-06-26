function clock() {
    new Rolldate({
        el: '#hour',
        lang: { 
            title: '選擇時間', 
            cancel: 'Cancel', 
            confirm: 'Confirm',
            hour: '時' 
        },
        value: '',
        format: 'hh'
    })
    new Rolldate({
        el: '#min',
        lang: { 
            title: '選擇時間', 
            cancel: 'Cancel', 
            confirm: 'Confirm', 
            min: '分' 
        },
        value: '',
        format: 'mm',
    })
}
