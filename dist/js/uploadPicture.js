function testupload(){
	const id = '1efdc6b59ca6d9f'; // 填入 App 的 Client ID
	const token = 'bfc1d843cc07fce2a4519733a2a024a7e2af8386'; // 填入 token
	 // 若要指定傳到某個相簿，就填入相簿的 ID
	 
	//- upload
	const upload = new Vue({
	  el: '#upload-wrap',
	  data: {
		file: null, // 準備拿 input type="file" 的值
		fs: {
		  name: '', // input的圖檔名稱
		  thumbnail: null, // input的圖片縮圖
		  size: null // input的圖片大小
		},
		title: '', // 圖片標題
		des: '' // 圖片描述
	  },
	  methods: {
		showpic(e) {
		if(e.target.files&&e.target.files[0]){	
		  this.file = e.target.files[0]; // input type="file" 的值
		  this.fs.name = this.file.name; // input的圖檔名稱
		  this.fs.size = Math.floor(this.file .size * 0.001) + 'KB'; // input的圖片大小
		  this.fs.thumbnail = window.URL.createObjectURL(this.file); // input的圖片縮圖
		  this.title = this.fs.name; // 預設 input 的圖檔名稱為圖片上傳時的圖片標題
	
		let settings = {
			async: true,
			crossDomain: true,
			processData: false,
			contentType: false,
			type: 'POST',
			url: 'https://api.imgur.com/3/image',
			headers: {
			  Authorization: 'Bearer ' + token
			},
			mimeType: 'multipart/form-data'
		  };
	 
		  let picture = new FormData();
		  picture.append('image', this.file);
		  picture.append('title', this.title);
		  picture.append('description', this.des);
	 
		  settings.data = picture;
	 
		  $.ajax(settings).done(function(res) {
			// 可以看見上傳成功後回的值
			var str=res;
			var str1=str.indexOf('link');
			var str2=str.indexOf('success');
			var url=res.substr(str1+7,str2-str1-7-4);
			$('#picURL').val(url);
			console.log($("#picURL").val());
			$(".pic1 div:nth-child(1)").remove();
			$(".pic1 div:nth-child(1)").remove();
			$(".pic1 div:nth-child(1)").remove();
			$(".pic1").toggleClass('pic2', true);
			$(".pic2").toggleClass('pic1', false);
			$(".pic2").prepend("<div style=\"background-image:url("+ url +")\"></div>");
			
		  });
		}},
		reload(){
		  
			
			$(".pic2").toggleClass('pic1', true);
			$(".pic1").toggleClass('pic2', false);
			$(".pic1 div:nth-child(1)").remove();
			$(".pic1").prepend("<div>(每種藥物僅可上傳一種照片)</div>");
			$(".pic1").prepend("<div>上傳照片</div>");
			$(".pic1").prepend("<div><img src=\"img/graph.png\"></div>");
			$('#picURL').val("");
			console.log($("#picURL").val());	
		}
	  }
	});
	
	
	
	
}
