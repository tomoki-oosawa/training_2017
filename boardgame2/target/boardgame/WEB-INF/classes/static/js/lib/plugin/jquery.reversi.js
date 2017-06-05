/**
 jquery.reversi.js ver1.0

The MIT License

Copyright (c) 2011 yapr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */



$(function() {
	/** セルに何も置かれていない状態 */
	var CLASS_BLANK = 'blank';
	var CLASS_BLACK = 'black';
	var CLASS_WHITE = 'white';
	var CLASS_HIGHLIGHT = 'blank highlight';

	var CLASS_MESSAGE_BAR    = 'message_bar';
	var CLASS_MESSAGE_DIALOG = 'message_dialog';

	/** 石が置かれた時のイベント */
	var EVENT_REVERSI_PUT = 'reversi_put';

	/** alert message */
	var MESSAGE_CANT_PUT  = 'It is not possible to put it there.';

	$.fn.reversi = function(options){
		/**
		 * default Options
		 */
		var defaults ={
			cpu   : true, //cpuを使用するか
			my_color : 'black' , //black or white
			cols  : 8   , //マス(横)
			rows  : 8   , //マス(縦)
			width : 296 , //縦幅
			height: 296   //横幅
		};

		return this.each(function(){
			var opts = $.extend(defaults , options);

			//styleの設定
			$(this).addClass('reversi_board');
			$(this).width(opts.width);
			$(this).height(opts.height);

			/** reversi盤[][] */
			var board = initBoard(defaults, opts , this);
			//infomation display component
			var _messagebar = createMessageBar(this , opts.width);
			var _messageDialog = createMessageDialog(this , opts.width);
			var turn = CLASS_BLACK;


			/*//websocketの設定
			var ws = new WebSocket("ws://localhost:8080/echo");
		    ws.onopen = function(){
		    };
		    ws.onclose = function(){
		    };
		    //盤面を書き換える処理を書く
		    ws.onmessage = function(message){
		    	var obj = message.data;
		    	var put = obj.split(",");
		    	//盤面の更新
		    	upsets(board , put[2] , put[0] , put[1]);
		    };
		    ws.onerror = function(event){
		        alert("接続に失敗しました。");
		    };*/



			//盤が押されたときの処理
			$(this).eq(0).bind(EVENT_REVERSI_PUT , function(e , data){


				//自分の石の色でない場合はクリック不可能
				/*if(turn != defaults.my_color){
					$.on("click",function(e){
						e.preventDefault();
						}
					);
				}*/

				//ハイライト初期化
				resetHighlight(board , data.col , data.row);

				//ひっくり返せないので置けない。
				if(!canPut(board , turn , data.col , data.row)){
					showMessage(MESSAGE_CANT_PUT , _messagebar);
					return;
				}

				//石を置く
				upsets(board , turn , data.col , data.row);

				//石を置いたら相手の画面にも反映される
				/*var put = [data.col,data.row,turn];
				ws.send(put);*/



				//終了判定
				if(isFinish(this)){
					var black = $(this).find('.' + CLASS_BLACK).length;
					var white = $(this).find('.' + CLASS_WHITE).length;

					//勝ちの判定
					var text = '<h5>' + ((black < white) ? 'white' : 'black') +  ' win!!</h5>';

					result(black, white, turn);

					if(black == white){
						text = '<h5>drow</h5>';
					}
					//text += '<p>It is reload when playing a game again as for a browser. </p>';

					//showDialog(text , _messageDialog);
					$('#leaving_button').attr('disabled', false);
					$('#resign_button').attr('disabled', true);
					return;
				}

				//確認用
				//result(black, white, turn);

				//相手のターンにチェンジ
				turn = nextTurn(board , (turn == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK , _messagebar);

				if(opts.cpu && turn != opts.my_color){
					cpuTurn(this , board , turn);
				}

				//ハイライト表示の設定
				setHighlight(board, turn, cols, rows);
			});

			//先手が白の場合
			if(opts.cpu && opts.my_color == CLASS_WHITE){
				cpuTurn(this , board , turn);
			}
		});
	};

	/**
	 * ボードの初期化処理
	 * 真ん中に黒と白のコマを配置する
	 *
	 * @params cols
	 * @params rows
	 * @return
	 */
	function initBoard(defaults, opts , board_element){
		var board = [];
		var cols = opts.cols;
		var rows = opts.rows;
		var myColor = defaults.my_color;


		//set cell
		cell_width  = opts.width /opts.cols - 2;//border 1px
		cell_height = cell_width;

		for(var i = 0; i < cols; i++){
			board[i] = [];
			for(var k = 0; k < rows; k++){
				var style_name = CLASS_BLANK;

				// ○●
				// ●○
				//加えて、置けるエリアの表示
				if((i == (cols / 2) - 1 && k == (rows / 2) - 1)  || (i == (cols / 2) && k == (rows / 2))){
					style_name = CLASS_BLACK;
				}else if((i == (cols / 2) - 1 && k == (rows / 2)) || (i == (cols / 2) && k == (rows / 2) - 1)){
					style_name = CLASS_WHITE;
				}else if(((i == (cols / 2) - 1 && k == (rows / 2) + 1) || (i == (cols / 2) && k == (rows / 2) - 2)) && myColor == CLASS_BLACK){
					style_name = CLASS_HIGHLIGHT;
				}else if(((i == (cols / 2) - 2 && k == (rows / 2)) || (i == (cols / 2) + 1 && k == (rows / 2) - 1)) && myColor == CLASS_BLACK){
					style_name = CLASS_HIGHLIGHT;
				}

				board[i][k] = $("<div/>", {
									  "class": style_name ,
									  "col"  : i ,
									  "row"  : k ,
									  "style": 'width:' + cell_width + 'px;height:' + cell_height + 'px;'
									}).appendTo(board_element);
			}
		}

		$(board_element).click(function(e){
			var target = $(e.target);

			target.parent().trigger(EVENT_REVERSI_PUT ,
								{
									'col' : target.attr('col') ,
									 'row' : target.attr('row')
								}
			);
		});

		return board;
	}

	/**
	 * ゲームが終わっているか
	 * @returns boolean
	 */
	function isFinish(board_elements){
		return (0 == $(board_elements).find('.' + CLASS_BLANK).length);
	}


	/**
	 * 追記
	 * 盤面すべてを検索してハイライトをブランクで初期化
	 */
	function resetHighlight(board , col , row){
		if(!board[col][row].hasClass(CLASS_HIGHLIGHT)){
			return false;
		}
		var onPut = board[col][row];
		onPut.removeClass(CLASS_HIGHLIGHT);
		onPut.addClass(CLASS_BLANK);
	}

	/**
	* 追記
	* ハイライトの設定
	*/
	function setHighlight(board, turn, cols, rows){
		//ハイライト部分をブランクに戻す
		for(var i = 0; i < cols; i++){
		for(var k = 0; k < rows; k++){
			if(board[i][k].hasClass(CLASS_HIGHLIGHT)){
				var onPut = board[i][k];
				onPut.removeClass(CLASS_HIGHLIGHT);
				onPut.addClass(CLASS_BLANK);
			}
		}
		}
	/**
	* 石を置ける場所を探して
	* ハイライト表示を行う
	*/
	//石を置ける場所を探す
	var array = [];
	for(var i = 0; i < cols; i++){
		for(var k = 0; k < rows; k++){
			if(canPut(board, turn, i, k)){
				array.push([i, k]);
			}
		}
		}
		//ハイライト表示の設定
		for(var i = 0; i < array.length; i++){
			var value = array[i];
			var boardPut = board[value[0]][value[1]];
			boardPut.removeClass(CLASS_BLANK);
			boardPut.addClass(CLASS_HIGHLIGHT);
		}
	}

	/*
	 *追記
	 *ajax通信で勝敗結果を送信
	 * */
	function result(black, white){
		if(black > white){
			var masterId = "win";
		}else if(black < white){
			var masterId = "lose";
		}

		var data = {
				masterResult : masterId,
			};
		$.ajax({
			type:"POST",
			url:"/othello",
			data:JSON.stringify(data),
			contentType: 'application/json',
			dataType: "json",
			success: function(json_data) {
				success(data);
			},
			error: function() {
				alert("XMLHttpRequest : " + XMLHttpRequest.status);
			},
		});
		function success(data){
			alert("ajax通信成功");
			console.log(data);
		}
	}

	/**
	 * 石を置いて周りの石をひっくり返す。
	 */
	function upsets(board , style_name , col , row){
		var firstPut = board[col][row];
		firstPut.removeClass(CLASS_BLANK);
		firstPut.addClass(style_name);

		var reverseElements = new Array();
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  0 , -1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 , -1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 ,  0 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  1 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row ,  0 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 ,  1 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 ,  0 , false));
		$.merge(reverseElements , findReverseElements(board , style_name , col , row , -1 , -1 , false));

		$(reverseElements).each(function(){
			this.attr('class' , style_name);
		});
	}


/*	var img = new Array();

	img[0] = new Image();
	img[0].src = "画像パス";
	img[1] = new Image();
	img[1].src = "画像パス";
	var cnt=0*/;


	/**
	 * 次のターンの色を決定する。
	 * 全く置く場所がなかった場合はパスとなり相手のターンとなる。
	 */
	function nextTurn(board , nextTurn , _messagebar){
		cols = board.length;
		rows = board[0].length;
		for(var i = 0; i < cols; i++){
			for(var k = 0; k < cols; k++){
				if(board[i][k].hasClass(CLASS_BLANK)){
					//置く場所があった場合、相手のターンになる
					if(canPut(board , nextTurn , i , k)){
						var ImgSrc = $("img#turn_stone").attr("src");

						/*
						if (cnt == 2){
							cnt=0;
						}else{
							cnt++;
						}
						document.getElementById("turn_stone").src=img[cnt].src;*/


						return nextTurn;
					}
				}
			}
		}

		//path
		//スキップボタンの表示
		//$('#skip_button').attr("disabled",false);
		return (nextTurn == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK;
	}

	/**
	 * 石を指定の位置に置くことが出来るかどうか
	 *
	 * 石が置ける条件:
	 * 隣あわせ（縦、横、斜め）に違う色の石があり、
	 * 対角線上に自分の色があること。
	 */
	function canPut(board , class_color , col , row){
		//isBlank
		if(!board[col][row].hasClass(CLASS_BLANK)){
			return false;
		}

		var canReverseArray = new Array();

		return $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 , -1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 ,  0)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  1 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row ,  0 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 ,  1)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 ,  0)).length
				|| $.merge(canReverseArray , findReverseElements(board , class_color , col , row , -1 , -1)).length;
	}

	/**
	 * 指定された位置から、支持された方向に対して、
	 * ひっくり返すことのできる石(element)を返す
	 * @return Array
	 */
	function findReverseElements(board , style_name , current_col , current_row , advances_col_index , advances_row_index){
		var reverseArray = new Array();
		var max_col = board.length -1;
		var max_row = board[0].length - 1;

		for(var i = 1 ;; i++){
			var col = parseInt(current_col) + advances_col_index * i;
			var row = parseInt(current_row) + advances_row_index * i;

			//端まで行った場合
			if(col > max_col
				|| col < 0
				|| row > max_row
				|| row < 0){
				break;
			}

			//隣接する石が同じだった場合
			var div = board[col][row];
			if(div.hasClass(CLASS_BLANK)
				|| (i == 1 && div.hasClass(style_name))){
				break;
			}

			if(div.hasClass(style_name)){
				//一つ目以降で対角線に自分の色が合ったらreturn
				return reverseArray;
				break;
			}else{
				//ひっくり返す石をkeepする.
				reverseArray[reverseArray.length] = div;
			}
		}

		return new Array();
	}

	/**
	 * メッセージ領域を生成する
	 * @returns Element
	 */
	function createMessageBar(board_element , width){
		//statusmessage
		return $("<div/>", {
			  "class": CLASS_MESSAGE_BAR ,
			  "style": "display:none;width:" + eval(width - 8) + "px;"
			}).appendTo(board_element);
	}

	/**
	 * ダイアログ領域を生成する
	 */
	function createMessageDialog(board_element , width){
		//statusmessage
		return $("<div/>", {
			  "class": CLASS_MESSAGE_DIALOG ,
			  "style": "display:none;width:" + width * 2/3 + "px;left:" + width / 6  + "px;"
			}).appendTo(board_element);
	}

	/**
	 * 盤内にメッセージを表示する。
	 */
	function showMessage(text , _messagebar){
		_messagebar.stop().css("opacity", 1)
	           .text(text)
	           .fadeIn(30).fadeOut(1800);
	}

	/**
	 * ダイアログを表示する。
	 */
	function showDialog(text , elem){
			$(elem).closest("." + CLASS_MESSAGE_DIALOG)
				   .stop()
				   .css("opacity", 1)
				   .html(text)
				   .fadeIn(90);
	}


    //投了ボタンが押されたのを検知する。
    $( '#resign_button' ) . click( function() {
        $( '#resign_dialog' ) . dialog( 'open' );
    } );

	//投了確認ダイアログ
    $( '#resign_dialog' ) . dialog( {
        title:"投了します",
        closeOnEscape:false,//エスケープキーでとじないように
        dialogClass:"no-close",//×ボタンを消す処理
        resizable:false,//サイズを変えられないように
        modal:true,//表示中はほかの処理をいじれないように
    	autoOpen: false,//勝手に開かないように
        buttons:{
        	"はい":function(){
        		$(this).dialog('close');
        		$('#result_dialog').dialog('open');
        		//投了ボタンの非表示
        		$('#resign_button').attr('disabled', true);
        		//スキップボタンの非表示
        		$('#skip_button').attr('disabled', true);
        		//退出ボタンの表示
        		$('#leaving_button').attr('disabled', false);

        		//ルームの状態を変更する。
        		var data = {
        				roomState : "2",
        			};
        		$.ajax({
        			type:"POST",
        			url:"/endgame",
        			data:JSON.stringify(data),
        			contentType: 'application/json',
        			dataType: "json",
        			});

        	},
        	"いいえ":function(){
        		$(this).dialog('close');
        	}
        }
    } );

    //勝敗表示ダイアログの処理
    $('#result_dialog').dialog({
    	autoOpen:false,
    	dialogClass:"no-close",//×ボタンを消す処理
    	closeOnEscape:false,//エスケープキーでとじないように
    	title:'結果',
    	modal:true,
    	dialogClass:"no-close",
    	resizable:false,
    	buttons:{
    		"OK":function(){
	       		$(this).dialog('close');
	       	}
		}
    });

});