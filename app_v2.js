const fs = require('fs')
const https = require('https')
const express = require('express')
const app = express()
const line = require('@line/bot-sdk')
const line_config = require('./config/line.js')
const db_config = require('./config/db.js')
const mysql = require('mysql')
const { formidable } = require('formidable')

const lineConfig = {
  channelAccessToken: line_config.accessToken,
  channelSecret: line_config.secret
}

const sslOptions = {
  key: fs.readFileSync(line_config.key_path),
  ca: fs.readFileSync(line_config.ca_path),
  cert: fs.readFileSync(line_config.cert_path)
}

//connect to mysql
const connection = mysql.createConnection(db_config.mysql)

connection.connect(err => {
  if (err) {
    console.log('fail to connect to mysql:', err)
    process.exit()
  }
})

app.use(express.static(`${__dirname}/dist`))
app.set('view engine', 'hbs')

//route
app.get('/add_medicine', (req, res) => {
  res.render('add_medicine')
})

app.get('/med_notify', (req, res) => {
  res.render('med_notify')
})

app.get('/contact', (req, res) => {
  res.render('contact')
})

app.get('/contact_invite', (req, res) => {
  res.render('contact_invite')
})

//add_line_friend-------------------------------
app.get('/add_line', (req, res) => {
  res.render('add_line')
})
//----------------------------------------------

app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
})

//Pill Box
app.get('/load-pillBoxPage', (req, res) => {
  connection.query(`SELECT * FROM user_Med WHERE userId = '${req.query.userId}'`, (err, result) => {
    if (err) console.log('fail to SELECT', err)
    res.send(result)
  })
})

app.get('/add-med', (req, res) => {
  if (req.query.queryCond == 'insert') {
    connection.query(`INSERT INTO user_Med(medName, totalAmount, onceAmount, medPicture, userId) VALUES ('${req.query.medName}', ${req.query.totalAmount}, ${req.query.onceAmount}, '${req.query.medPicture}', '${req.query.userId}')`, (err, result) => {
      if (err) console.log('fail to INSERT:', err)
    })
  }
  else if (req.query.queryCond == 'update') {
    connection.query(`UPDATE user_Med SET medName = '${req.query.medName}', totalAmount=${req.query.totalAmount}, onceAmount=${req.query.onceAmount} WHERE user_MedId = ${req.query.user_MedId}`, (err, result) => {
      if (err) console.log('fail to UPDATE:', err)
    })
  }
  res.send('success')
})

app.get('/edit-med', (req, res) => {
  connection.query(`SELECT * FROM user_Med WHERE user_MedId = ${req.query.user_MedId}`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    res.send(result)
  })
})

app.get('/delete-med', (req, res) => {
  connection.query(`DELETE FROM user_Med WHERE user_MedId = ${req.query.user_MedId}`,(err, result) => {
    if (err) console.log('fail to DELETE:', err)
    res.send('delete success')
  })  
})

//Notify
app.get('/get-notify', (req, res) => {
  connection.query(`SELECT * FROM user_Notify WHERE userId = '${req.query.userId}' ORDER BY notifyTime`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    res.send(result)
  })
})

app.get('/get-med-notify', (req, res) => {
  connection.query(`SELECT * FROM Notify_Med, user_Med WHERE user_NotifyId = '${req.query.user_NotifyId}' AND Notify_Med.user_MedId = user_Med.user_MedId`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    res.send(result)
  })
})

app.get('/pick-med', (req, res) => {
  connection.query(`SELECT * FROM user_Med WHERE userId = '${req.query.userId}'`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    res.send(result)
  })
})

app.get('/create-med-notify', (req, res) => {
  if (req.query.queryCond == 'insert') {

    let user_NotifyId
    connection.query(`INSERT INTO user_Notify(notifyTime, userId) VALUES ('${req.query.hour}:${req.query.min}', '${req.query.userId}')`, (err, result) => {
      if (err) console.log('fail to INSERT:', err)
    })
    connection.query(`SELECT user_NotifyId FROM user_Notify WHERE notifyTime = '${req.query.hour}:${req.query.min}' AND userId = '${req.query.userId}'`, (err, result) => {
      if (err) console.log('fail to SELECT:', err)
      req.query.user_MedId.forEach(element => {
        connection.query(`INSERT INTO Notify_Med(user_NotifyId, user_MedId) VALUES (${result[0].user_NotifyId}, ${element})`, (err, result) => {
          if (err) console.log('fail to INSERT:', err)
        })
      })
    })
  }
  else if (req.query.queryCond.split('_')[0] == 'update') {
    connection.query(`UPDATE user_Notify SET notifyTime = '${req.query.hour}:${req.query.min}' WHERE user_NotifyId = ${req.query.queryCond.split('_')[1]}`, (err, result) => {
      if (err) console.log('fail to UPDATE:', err)
    })
    connection.query(`DELETE FROM Notify_Med WHERE user_NotifyId = ${req.query.queryCond.split('_')[1]}`, (err, result) => {
      if (err) console.log('fail to DELETE:', err)
    })
    req.query.user_MedId.forEach(element => {
      connection.query(`INSERT INTO Notify_Med(user_NotifyId, user_MedId) VALUES (${req.query.queryCond.split('_')[1]}, ${element})`, (err, result) => {
        if (err) console.log('fail to INSERT:', err)
      })    
    })
  }
  res.send('success')
})

app.get('/edit-notify', (req, res) => {
  console.log(`editing user_NotifyId:${req.query.user_NotifyId}`)
  connection.query(`SELECT user_MedId FROM Notify_Med WHERE user_NotifyId = ${req.query.user_NotifyId}`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    res.send(result)
  }) 
})

app.get('/delete-notify', (req, res) => {
  connection.query(`DELETE FROM user_Notify WHERE user_NotifyId = ${req.query.user_NotifyId}`, (err, result) => {
    if (err) console.log('fail to DELETE:', err)
    res.send('delete success')
  })

})

//Contact
app.get('/sending_error_msg', (req, res)=>{
  const client = new line.Client(lineConfig)
  client.pushMessage(req.query.userid, [{type:'text', text: `${req.query.txt}`}])
  res.send('111')
  console.log('有人在皮')
})

app.get('/get_contact_data', (req, res)=>{
  console.log('get_contact_data')
  var result1_length
  var result2_length
  /*var bin = '<img src="https://luffy.ee.ncku.edu.tw:5331/img/bin.png">' //port revised
  var str1 = ''
  var str2 = ''*/
  var supervisor_result
  var supervisee_result
  connection.query(`SELECT * FROM Supervise, user_Info WHERE superviseeId = '${req.query.user}' AND userId = supervisorId`, (err, all_supervisor) => {
    result1_length = all_supervisor.length
    console.log(all_supervisor)
    supervisor_result=all_supervisor
  })
  connection.query(`SELECT * FROM Supervise, user_Info WHERE supervisorId = '${req.query.user}' AND userId = superviseeId`, (err, all_supervisee) => {
    result2_length = all_supervisee.length
    console.log(all_supervisee)
    supervisee_result=all_supervisee
    res.send(
      {'supervisor_info': {'sql_data':supervisor_result, 'length':result1_length}, 'supervisee_info': {'sql_data':supervisee_result, 'length':result2_length}}
    )
  })

  /*setTimeout(function(){
    
  }, 300)*/
})

app.get('/delete_contact', (req,res)=>{

  connection.query(`DELETE FROM Supervise WHERE superviseeId = '${req.query.supervisee}' AND supervisorId = '${req.query.supervisor}'`, (err, result) => {
    if(err) console.log('fail to delete:', err)
    connection.query(`INSERT INTO Blacklist(superviseeId, supervisorId) VALUES ('${req.query.supervisee}','${req.query.supervisor}')`, (err, result) => {
      if(err) console.log('fail to insert:', err)
      else{
        console.log('被封鎖了QQ')
        //const client = new line.Client(lineConfig)
        //client.pushMessage(req.query.supervisee_Id, [{type:"text", text:`${supervisor_name}成為您的藥物提醒監督人！`}])
        //client.pushMessage(req.query.supervisor_Id, [{type:"text", text:`${supervisee_name}成為您的藥物提醒被監督人！`}])
      }
    })
  })
  console.log(`${req.query.supervisor}`)
  console.log(`${req.query.supervisee}`)

  var result1_length
  var result2_length
  var bin = '<img src="https://luffy.ee.ncku.edu.tw:5331/img/bin.png">' //port revised
  var str1 = ''
  var str2 = ''

  setTimeout(function(){
    connection.query(`SELECT * FROM Supervise, user_Info WHERE superviseeId = '${req.query.user}' AND userId = supervisorId`, (err, all_supervisor) => {
      result1_length = all_supervisor.length
      console.log(all_supervisor)
      supervisor_result=all_supervisor
    })
    connection.query(`SELECT * FROM Supervise, user_Info WHERE supervisorId = '${req.query.user}' AND userId = superviseeId`, (err, all_supervisee) => {
      result2_length = all_supervisee.length
      console.log(all_supervisee)
      supervisee_result=all_supervisee
    })
  }, 350)
  setTimeout(function(){
    res.send(
      {'supervisor_info': {'sql_data':supervisor_result, 'length':result1_length}, 'supervisee_info': {'sql_data':supervisee_result, 'length':result2_length}}
    )
  }, 750)
    /*connection.query(`SELECT supervisorId FROM Supervise WHERE superviseeId = '${req.query.user}'`, (err, all_supervisor) => {
      result1_length = all_supervisor.length
      for(var i=0; i<all_supervisor.length; i=i+1){
        connection.query(`SELECT * FROM user_Info WHERE userId = '${all_supervisor[i]['supervisorId']}'`, (err, supervisor_result) => {
          for(var j=0; j<supervisor_result.length; j=j+1){
            str1 = str1 + `<div class="contacter_info">
                          <div class="profile" style="background-image:url(${supervisor_result[j]['picture']})"></div>
                          <div class="appellation">${supervisor_result[j]['userName']}</div>
                          <div class="del" onclick="check_to_delete_supervisor('${supervisor_result[j]['userId']}')">
                            <button class="btn mx-auto supervisee_view" value="$${supervisor_result[j]['userId']}" superviseeName="${supervisor_result[j]['userName']}" superviseePicture="${supervisor_result[j]['picture']}">
                              <div id="del">
                                <div>${bin}</div>
                              <div>刪除</div>
                              </div>
                            </button>
                          </div>
                        </div>`
          }
        })
      }
      //setTimeout(function(){str1 = str1+`<button id="btnShare_beSupervisor" >新增我的提醒人</button>`},350)
    })
    connection.query(`SELECT superviseeId FROM Supervise WHERE supervisorId = '${req.query.user}'`, (err, all_supervisee) => {
      result2_length = all_supervisee.length
      for(var i=0; i<all_supervisee.length; i=i+1){
        connection.query(`SELECT * FROM user_Info WHERE userId = '${all_supervisee[i]['superviseeId']}'`, (err, supervisee_result) => {
          for(var j=0; j<supervisee_result.length; j=j+1){
            str2 = str2 + `<div class="contacter_info">
                          <div class="profile" style="background-image:url(${supervisee_result[j]['picture']})"></div>
                          <div class="appellation">${supervisee_result[j]['userName']}</div>
                          <div class="del" onclick="check_to_delete_supervisee('${supervisee_result[j]['userId']}')">
                            <button class="btn mx-auto supervisee_view" value="$${supervisee_result[j]['userId']}" superviseeName="${supervisee_result[j]['userName']}" superviseePicture="${supervisee_result[j]['picture']}">
                              <div id="del">
                                <div>${bin}</div>
                              <div>刪除</div>
                              </div>
                            </button>
                          </div>
                        </div>`
          }
        })
      }
      //setTimeout(function(){str2 = str2+`<button id="btnShare_beSupervisee" >新增我的被監督人</button>`},350)
    })
  }, 350)

  setTimeout(function(){
    res.send(
      {'supervisor_info': {'html':str1, 'length':result1_length}, 'supervisee_info': {'html':str2, 'length':result2_length}}
    )
  }, 750)*/
})
app.get('/prompt', (req, res)=>{
  console.log('prompt')
  console.log(req.query.x)
  console.log(req.query.y)
  res.send('bitch')
})
app.get('/add_friend', (req, res)=>{
  console.log('乖孫美美被進來了')
  console.log(req.query.link)
  res.send('shit')
})
app.get('/agree', (req, res)=>{
  console.log('乖孫美美被認可了')
  console.log(`supervisor: ${req.query.supervisor_Id}`)
  console.log(`supervisee: ${req.query.supervisee_Id}`)
  console.log(req.query.state)
  console.log(`time=${req.query.time}`)
  date = Date.now()
  connection.query(`SELECT * FROM Supervise WHERE superviseeId = '${req.query.supervisee_Id}' AND supervisorId = '${req.query.supervisor_Id}'`, (err, result) => {
    if(result.length==0){
      /*connection.query(`SELECT * FROM Blacklist WHERE superviseeId = '${req.query.supervisee_Id}' AND supervisorId = '${req.query.supervisor_Id}'`, (err, result) => {
        if(result.length==0)*/
        if(date-req.query.time<=60*1000){
          console.log('沒有加過')
          if(req.query.state=='agree')connection.query(`INSERT INTO Supervise(superviseeId, supervisorId) VALUES ('${req.query.supervisee_Id}','${req.query.supervisor_Id}')`, (err, result) => {
            if(err) console.log('fail to insert:', err)
            else{
              console.log('新增小王八蛋成功')
              const client = new line.Client(lineConfig)
              //-------------------------------------------------
              connection.query(`SELECT * FROM user_Info WHERE userId = '${req.query.supervisee_Id}'`, (err, supervisee_result) => {
                for(var j=0; j<supervisee_result.length; j=j+1){
                  client.pushMessage(req.query.supervisor_Id, [{type:"text", text:`${supervisee_result[j]['userName']}成為您的藥物提醒被監督人！`}])
                }
              })
              connection.query(`SELECT * FROM user_Info WHERE userId = '${req.query.supervisor_Id}'`, (err, supervisor_result) => {
                for(var j=0; j<supervisor_result.length; j=j+1){
                  client.pushMessage(req.query.supervisee_Id, [{type:"text", text:`${supervisor_result[j]['userName']}成為您的藥物提醒監督人！`}])
                }
              })
              //-------------------------------------------------
              //client.pushMessage(req.query.supervisee_Id, [{type:"text", text:`${supervisor_name}成為您的藥物提醒監督人！`}])
              //client.pushMessage(req.query.supervisor_Id, [{type:"text", text:`${supervisee_name}成為您的藥物提醒被監督人！`}])
            }
          })
          res.send('no')
        }
        else{
          console.log('加過但已經無效')
          res.send('yes_and_deleted')
        }
      //})
      /*if(req.query.state=='agree')connection.query(`INSERT INTO Supervise(superviseeId, supervisorId) VALUES ('${req.query.supervisee_Id}','${req.query.supervisor_Id}')`, (err, result) => {
        if(err) console.log('fail to insert:', err)
        else{
          console.log('新增小王八蛋成功')
          const client = new line.Client(lineConfig)
          //client.pushMessage(req.query.supervisee_Id, [{type:"text", text:`${supervisor_name}成為您的藥物提醒監督人！`}])
          //client.pushMessage(req.query.supervisor_Id, [{type:"text", text:`${supervisee_name}成為您的藥物提醒被監督人！`}])
        }
      })*/
    }
    else{
      res.send('yes')
      console.log('加過了，你這個小王八蛋')
    }
  })
})
app.get('/invite_someone_to_be_supervisee', (req, res)=>{
  res.send('fuck ur grandson')
  console.log('乖孫美美發送了一個邀請阿罵的訊息')
})

app.get('/invite_someone_to_be_supervisor', (req, res) =>{
  res.send('fuck ur grandma')
  console.log('乖孫美美發送了一個邀請聯絡人的訊息')
})
//////////////////////////////////////////////////


const client = new line.Client(lineConfig)

//////////////////////////////////////////////////

function run() {
  var now = new Date()

  if (now.getSeconds() == 0) {  // 這樣就只會執行一次
    connection.query(`INSERT INTO user_Notify_temp SELECT * FROM user_Notify WHERE switch = 'checked' AND notifyTime = '${now.getHours()}:${now.getMinutes()}:00'`, (err, result) => {
      if (err) console.log('fail to INSERT:', err)
    })
  }

  connection.query(`SELECT user_NotifyId, notifyTime, userId FROM user_Notify WHERE switch = 'checked' AND notifyTime = '${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}'
                    UNION SELECT user_NotifyId, notifyTime, userId FROM user_Notify_temp WHERE notifyTime = '${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}'`, (err, result) => {
    if (err) console.log('fail to SELECT:', err)
    if (result.length == 0) return;
    console.log(result)
    console.log()

    var now = new Date()
    for (var i = 0; i < result.length; i++) {
      // 次數+1
      connection.query(`UPDATE user_Notify_temp SET time = time + 1 WHERE userId = '${result[i]['userId']}'`, (err, result) => {
        if (err) console.log('fail to UPDATE:', err)
      })

      // 提醒三次就停止提醒
      connection.query(`DELETE FROM user_Notify_temp WHERE userId = '${result[i]['userId']}' AND time = 3`, (err, result) => {
        if (err) console.log('fail to DELETE:', err)
      })

      var drug = {
        type : 'text',
        text : `現在時間是${now.getHours()}:${now.getMinutes()}，記得藥服用以下藥物：`
      }

      var carousel_msg = {
        type : "template",
        altText : "this is an image carousel template",
        template : {
          type : "image_carousel",
          columns : []
        }
      }

      var check_message = {
        type : "template",
        altText : "This is a buttons template",
        template : {
            type : "buttons",
            title : "您服用藥物了嗎？",
            text : "若服用完藥物，點選「吃了」，若還沒服用，我們將10分鐘後提醒您。",
            actions : [
                {
                  type : "postback",
                  label : "吃了",
                  text : "吃了",
                  data : `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
                }
            ]
        }
      }

      connection.query(`UPDATE user_Notify_temp SET notifyTime = DATE_ADD(notifyTime, INTERVAL 10 MINUTE) WHERE user_NotifyId = ${result[i]['user_NotifyId']}`, (err, result) => {
        if (err) console.log('fail to UPDATE:', err)
      })
      
      connection.query(`SELECT * FROM user_Med, Notify_Med WHERE user_Med.user_MedId = Notify_Med.user_MedId AND Notify_Med.user_NotifyId = ${result[i]['user_NotifyId']}`, (err, result) => {
        if (err) console.log('fail to UPDATE:', err)
        result.forEach(element => {
          carousel_msg.template.columns.push({
            "imageUrl": element.medPicture,
            "action": {
              "type": "message",
              "label": `${element.medName}，${element.onceAmount}顆`,
              "text": `${element.medName}，${element.onceAmount}顆`
            }
          })  
        })
      })

      /*const message = []
      message.push(drug)
      message.push(carousel_msg)    // console.log 顯示出來的時候 columns 是空的，但是最後送出來又有 真神奇！
      message.push(check_message)
      console.log(message)*/

      var r = result[i]['userId']   // 不知為啥一定要獨立出來寫才不會 TypeError: Cannot read property 'userId' of undefined (好像有query 就會有延遲和同步問題)

      // 因為非同步問題，所以要讓 replyMessage 延後一秒再執行，才會有所有訊息
      //setTimeout(function(){client.pushMessage(r, message);}, 1000)

      // var r = result[i]['userId']
       client.pushMessage(r, drug)
       setTimeout(function(){client.pushMessage(r, carousel_msg);}, 1000)
       setTimeout(function(){client.pushMessage(r, check_message);}, 2000)

      // client.pushMessage(r, drug)
      // client.pushMessage(r, carousel_msg)
      // client.pushMessage(r, check_message)
    }
  })
}

setInterval(run, 1000)

function handleEvent(event) {
  console.log(event)
  //------------------隱藏功能----------------------
  //console.log(event.type)
  if(event.type == 'message'){
    console.log(event['message']['text'])
    if(event['message']['text'].indexOf('1216')!=-1){
      let data = event['message']['text'].split('1216')
      connection.query(`SELECT userId FROM user_Info WHERE userName = '${data[0]}'`, (err, result) => {
        if(result.length>0){
          console.log('傳成功了！')
          client.pushMessage(result[0]['userId'], {type:"text", text:`${data[1]}`})
          client.replyMessage(event.replyToken, [{type:"text", text:`「${data[1]}」 已經送給 ${data[0]} 了！`}])
        }
      })
    }
  }
  //------------------------------------------------
  if (event.type == 'follow') {
    client.getProfile(event.source.userId).then((profile) => {
      connection.query(`INSERT INTO user_Info(userId, userName, picture) VALUES ('${profile.userId}', '${profile.displayName}', '${profile.pictureUrl}')`, (err, result) => {
        if (err) {
          console.log('fail to INSERT:', err)
          //setTimeout(function(){console.log('fuqqq')},3000)
        }
      })
    })

    /*let greeting = {
      "type": "template",
      "altText": "this is a buttons template",
      "template": {
        "type": "buttons",
        "thumbnailImageUrl": "https://luffy.ee.ncku.edu.tw:5331/img/drugbox_template.jpg",//改
        "imageAspectRatio": "rectangle",
        "imageSize": "cover",
        "title": "建立我的藥盒",
        "text": "請您先提供目前服用的藥物有哪些吧！",
        "actions": [
          {
            "type": "uri",
            "label": "新增藥物",
            "uri" : "https://liff.line.me/1655992379-J52q7RjX"//改
          }
        ]
      }
    }*/
    //-------------------------------------contact------------------------------------------

    let greeting1 = [
      {
        "type": "template",
        "altText": "this is a buttons template",
        "template": {
          "type": "buttons",
          "thumbnailImageUrl": "https://luffy.ee.ncku.edu.tw:5331/img/drugbox_template.jpg",//改
          "imageAspectRatio": "rectangle",
          "imageSize": "cover",
          "title": "建立我的藥盒",
          "text": "請您先提供目前服用的藥物有哪些吧！",
          "actions": [
            {
              "type": "uri",
              "label": "新增藥物",
              "uri" : "https://liff.line.me/1655976760-jRn90NrG"//改
            }
          ]
        }
      },
      {
        "type": "template",
        "altText": "this is a buttons template",
        "template": {
          "type": "buttons",
          "thumbnailImageUrl": "https://luffy.ee.ncku.edu.tw:5331/img/contact_with_green_background.png",//改
          "imageAspectRatio": "rectangle",
          "imageSize": "cover",
          "title": "建立我的聯絡人",
          "text": "您可以為他人設定藥物提醒，或是讓他人為您設定藥物提醒！",
          "actions": [
            {
              "type": "uri",
              "label": "建立我的聯絡人",
              "uri" : "https://liff.line.me/1655976760-Ao0lzeLx"//改
            }
          ]
        }
      }
    ]
    //-----------------------------------------------------------------------------------------
    client.replyMessage(event.replyToken, greeting1)
  }

  if (event.type == 'unfollow') {
    connection.query(`DELETE FROM user_Info WHERE userId = '${event.source.userId}'`, (err, result) => {
      if (err) console.log('fail to DELETE:', err)
    })
  }

  // if (event.type == 'message') {
  //   if (event.message.text == '吃了') {
  //     var now = new Date()
  //     connection.query(`DELETE FROM user_Notify_temp WHERE notifyTime >= '${now.getHours()}:${now.getMinutes()}:00' AND userId = '${event.source.userId}'`, (err, result) => {
  //       if (err) console.log('fail to DELETE:', err)
  //     })
  //   }
  // }

  if (event.type == 'postback') {
    const message = [{
      type: 'text',
      text: '收到'
    }];

    // message.push(
    //   {
    //     type: 'text',
    //     text: `警告！`
    //   }
    // )

    connection.query(`DELETE FROM user_Notify_temp WHERE notifyTime >= '${event.postback.data}' AND userId = '${event.source.userId}'`, (err, result) => {
      if (err) console.log('fail to DELETE:', err)
    })
    
    connection.query(`UPDATE user_Med SET totalAmount = totalAmount - onceAmount WHERE userId = '${event.source.userId}' AND totalAmount >= onceAmount`, (err, result) => {
      if (err) console.log('fail to UPDATE:', err)
    })

    connection.query(`SELECT medName, totalAmount, onceAmount FROM user_Med WHERE userId = '${event.source.userId}'`, (err, result) => {
      if (err) console.log('fail to SELECT', err)
      console.log(result)
      console.log()

      for (var i = 0; i < result.length; i++) {
        if (result[i].totalAmount <= result[i].onceAmount * 3) {
          message.push(
            {
              type: 'text',
              text: `警告！"${result[i].medName}"即將不足！\n請盡速捕貨`
            }
          )
        }
      }
    })

    // 因為非同步問題，所以要讓 replyMessage 延後一秒再執行，才會有所有訊息
    setTimeout(function(){client.replyMessage(event.replyToken, message);}, 1000)   // replyToken 只能用一次
  }
}

const server = https.createServer(sslOptions, app)

server.listen(line_config.port, () => {
	console.log(`listen on port ${line_config.port}`)
})