// ==================================
// Part 1 - incoming messages, look for type
// ==================================
var ibc = {};
var chaincode = {};
var async = require('async');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var btoa = require('btoa')

module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};

module.exports.process_msg = function(ws, data){
	console.log("data", data, data.type, data.v)
	if(data.v === 1){																						//only look at messages for part 1
		if(data.type == 'create'){
			console.log('its a create!');
			console.log("data account as key", data.accountID)
			if(data.to && data.from && data.amount ){
				console.log("_________")
				console.log(data.from)
				console.log(data.amount)
				console.log(data.to)
				console.log("New Transaction  - about to invoke chaincode")
				// chaincode.invoke.init_marble([data.name, data.color, data.size, data.user], cb_invoked);	//create a new marble
				chaincode.invoke.transfer_balance([data.from, data.to, data.amount],cb_invoked);
				soapRequest(data.from, data.to, data.amount);

			}
		}
		else if(data.type == 'get'){
			console.log('get account msg');
			chaincode.query.read(["_accountindex" ], cb_got_index);
		}
		else if(data.type == 'delete'){
			console.log('removing msg');
			if(data.name){
				chaincode.invoke.delete([data.accountID]);
			}
		}
		else if(data.type == 'chainstats'){
			console.log('chainstats msg');
			ibc.chain_stats(cb_chainstats);
		}
	}

	//got the marble index, lets get each marble
	function cb_got_index(e, index){
		if(e != null) console.log('[ws error] did not get marble index:', e);
		else{
			try{
				var json = JSON.parse(index);
				var keys = Object.keys(json);
				var concurrency = 1;

				//serialized version
				async.eachLimit(keys, concurrency, function(key, cb) {
					console.log('!', json[key]);
					chaincode.query.read([json[key]], function(e, marble) {
						if(e != null) console.log('[ws error] did not get marble:', e);
						else {
							if(marble) sendMsg({msg: 'marbles', e: e, marble: JSON.parse(marble)});
							cb(null);
						}
					});
				}, function() {
					sendMsg({msg: 'action', e: e, status: 'finished'});
				});
			}
			catch(e){
				console.log('[ws error] could not parse response', json);
			}
		}
	}
	
	function cb_invoked(e, a){
		console.log('response: ', e, a);
		if (a==null){
					// soapRequest(data.from, data.to, data.amount);
		}

	}
	
	//call back for getting the blockchain stats, lets get the block stats now
	function cb_chainstats(e, chain_stats){
		if(chain_stats && chain_stats.height){
			chain_stats.height = chain_stats.height - 1;								//its 1 higher than actual height
			var list = [];
			for(var i = chain_stats.height; i >= 1; i--){								//create a list of heights we need
				list.push(i);
				if(list.length >= 8) break;
			}
			list.reverse();																//flip it so order is correct in UI
			async.eachLimit(list, 1, function(block_height, cb) {						//iter through each one, and send it
				ibc.block_stats(block_height, function(e, stats){
					if(e == null){
						stats.height = block_height;
						sendMsg({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
					}
					cb(null);
				});
			}, function() {
			});
		}
	}
	
	//send a message, socket might be closed...
	function sendMsg(json){
		if(ws){
			try{
				ws.send(JSON.stringify(json));
			}
			catch(e){
				console.log('[ws error] could not send msg', e);
			}
		}
	}
	function soapRequest(from, to, amount){
			var str = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    				    '<soap:Body>' +
        					'<ns1:importJournalsAsync xmlns:ns1="http://xmlns.oracle.com/apps/financials/generalLedger/journals/desktopEntry/journalImportService/types/">' +
		            			'<ns1:interfaceRows xmlns:ns2="http://xmlns.oracle.com/apps/financials/generalLedger/journals/desktopEntry/journalImportService/">' +
	                				'<ns2:BatchName>Blockchain Demo - General Accounting</ns2:BatchName>' +
	                				'<ns2:BatchDescription>Posted from Block Chain Transaction</ns2:BatchDescription>' +
	                				'<ns2:LedgerId>1</ns2:LedgerId>' +
	                				'<ns2:AccountingPeriodName>Mar-17</ns2:AccountingPeriodName>' +
	                				'<ns2:AccountingDate>2017-03-30</ns2:AccountingDate>' +
	                				'<ns2:UserSourceName>Manual</ns2:UserSourceName>' +
	                				'<ns2:UserCategoryName>Manual</ns2:UserCategoryName>' +
	                				'<ns2:ErrorToSuspenseFlag>True</ns2:ErrorToSuspenseFlag>' +
	                				'<ns2:SummaryFlag>True</ns2:SummaryFlag>' +
	                				'<ns2:ImportDescriptiveFlexField>N</ns2:ImportDescriptiveFlexField>' +
	                				'<ns2:GlInterface>' +
	                    					'<ns2:LedgerId>1</ns2:LedgerId>' +
	                    					'<ns2:PeriodName>Mar-17</ns2:PeriodName>' +
	                    					'<ns2:AccountingDate>2017-03-30</ns2:AccountingDate>' +
	                    					'<ns2:UserJeSourceName>Manual</ns2:UserJeSourceName>' +
	                    					'<ns2:UserJeCategoryName>Manual</ns2:UserJeCategoryName>' +
	                    					'<ns2:GroupId></ns2:GroupId>' +
	                    					'<ns2:ChartOfAccountsId></ns2:ChartOfAccountsId>' +
	                    					'<ns2:BalanceType>A</ns2:BalanceType>' +
	                    					'<ns2:CodeCombinationId></ns2:CodeCombinationId>' +
	                    					'<ns2:Segment1>'+from.substr(0,2)+'</ns2:Segment1>' +
	                    					'<ns2:Segment2>'+from.substr(3,3)+'</ns2:Segment2>' +
	                    					'<ns2:Segment3>'+from.substr(7,4)+'</ns2:Segment3>' +
	                    					'<ns2:Segment4>'+from.substr(12,4)+'</ns2:Segment4>' +
	                    					'<ns2:Segment5>'+from.substr(17,3)+'</ns2:Segment5>' +
	                    					'<ns2:Segment6></ns2:Segment6>' +
	                    					'<ns2:Segment7></ns2:Segment7>' +
	                    					'<ns2:Segment8></ns2:Segment8>' +
	                    					'<ns2:Segment9></ns2:Segment9>' +
	                    					'<ns2:Segment10></ns2:Segment10>' +
	                    					'<ns2:Segment11></ns2:Segment11>' +
	                    					'<ns2:Segment12></ns2:Segment12>' +
	                    					'<ns2:Segment13></ns2:Segment13>' +
	                    					'<ns2:Segment14></ns2:Segment14>' +
	                    					'<ns2:Segment15></ns2:Segment15>' +
	                    					'<ns2:Segment16></ns2:Segment16>' +
	                    					'<ns2:Segment17></ns2:Segment17>' +
	                    					'<ns2:Segment18></ns2:Segment18>' +
	                    					'<ns2:Segment19></ns2:Segment19>' +
	                    					'<ns2:Segment20></ns2:Segment20>' +
	                    					'<ns2:Segment21></ns2:Segment21>' +
	                    					'<ns2:Segment22></ns2:Segment22>' +
	                    					'<ns2:Segment23></ns2:Segment23>' +
	                    					'<ns2:Segment24></ns2:Segment24>' +
	                    					'<ns2:Segment25></ns2:Segment25>' +
	                    					'<ns2:Segment26></ns2:Segment26>' +
	                    					'<ns2:Segment27></ns2:Segment27>' +
	                    					'<ns2:Segment28></ns2:Segment28>' +
	                    					'<ns2:Segment29></ns2:Segment29>' +
	                    					'<ns2:Segment30></ns2:Segment30>' +
	                    					'<ns2:CurrencyCode>USD</ns2:CurrencyCode>' +
	                    					'<ns2:EnteredCrAmount currencyCode="USD">'+amount.toString()+'</ns2:EnteredCrAmount>' +
	                    					'<ns2:AccountedCr></ns2:AccountedCr>' +
	                    					'<ns2:AccountedDr></ns2:AccountedDr>' +
	                    					'<ns2:StatisticalValue></ns2:StatisticalValue>' +
	                    					'<ns2:UserCurrencyConversionType></ns2:UserCurrencyConversionType>' +
	                    					'<ns2:CurrencyConversionDate></ns2:CurrencyConversionDate>' +
	                    					'<ns2:CurrencyConversionRate></ns2:CurrencyConversionRate>' +
	                    					'<ns2:CurrencyConversionType></ns2:CurrencyConversionType>' +
	                    					'<ns2:Reference1></ns2:Reference1>' +
	                    					'<ns2:Reference2></ns2:Reference2>' +
	                    					'<ns2:Reference3></ns2:Reference3>' +
	                    					'<ns2:Reference6></ns2:Reference6>' +
	                    					'<ns2:Reference7></ns2:Reference7>' +
	                    					'<ns2:Reference8></ns2:Reference8>' +
	                    					'<ns2:Reference9></ns2:Reference9>' +
	                    					'<ns2:Reference10></ns2:Reference10>' +
	                    					'<ns2:Reference11></ns2:Reference11>' +
	                    					'<ns2:Reference12></ns2:Reference12>' +
	                    					'<ns2:Reference13></ns2:Reference13>' +
	                    					'<ns2:Reference14></ns2:Reference14>' +
	                    					'<ns2:Reference15></ns2:Reference15>' +
	                    					'<ns2:Reference16></ns2:Reference16>' +
	                    					'<ns2:Reference17></ns2:Reference17>' +
	                    					'<ns2:Reference18></ns2:Reference18>' +
	                    					'<ns2:Reference19></ns2:Reference19>' +
	                    					'<ns2:Reference20></ns2:Reference20>' +
	                    					'<ns2:Reference21></ns2:Reference21>' +
	                    					'<ns2:Reference22></ns2:Reference22>' +
	                    					'<ns2:Reference23></ns2:Reference23>' +
	                    					'<ns2:Reference24></ns2:Reference24>' +
	                    					'<ns2:Reference25></ns2:Reference25>' +
	                    					'<ns2:Reference26></ns2:Reference26>' +
	                    					'<ns2:Reference27></ns2:Reference27>' +
	                    					'<ns2:Reference28></ns2:Reference28>' +
	                    					'<ns2:Reference29></ns2:Reference29>' +
	                    					'<ns2:Reference30></ns2:Reference30>' +
	                    					'<ns2:ReferenceDate></ns2:ReferenceDate>' +
	                    					'<ns2:Attribute1></ns2:Attribute1>' +
	                    					'<ns2:Attribute2></ns2:Attribute2>' +
	                    					'<ns2:Attribute3></ns2:Attribute3>' +
	                    					'<ns2:Attribute4></ns2:Attribute4>' +
	                    					'<ns2:Attribute5></ns2:Attribute5>' +
	                    					'<ns2:Attribute6></ns2:Attribute6>' +
	                    					'<ns2:Attribute7></ns2:Attribute7>' +
	                    					'<ns2:Attribute8></ns2:Attribute8>' +
	                    					'<ns2:Attribute9></ns2:Attribute9>' +
	                    					'<ns2:Attribute10></ns2:Attribute10>' +
	                    					'<ns2:Attribute11></ns2:Attribute11>' +
	                    					'<ns2:Attribute12></ns2:Attribute12>' +
	                    					'<ns2:Attribute13></ns2:Attribute13>' +
	                    					'<ns2:Attribute14></ns2:Attribute14>' +
	                    					'<ns2:Attribute15></ns2:Attribute15>' +
	                    					'<ns2:Attribute16></ns2:Attribute16>' +
	                    					'<ns2:Attribute17></ns2:Attribute17>' +
	                    					'<ns2:Attribute18></ns2:Attribute18>' +
	                    					'<ns2:Attribute19></ns2:Attribute19>' +
	                    					'<ns2:Attribute20></ns2:Attribute20>' +
	                    					'<ns2:AttributeCategory></ns2:AttributeCategory>' +
	                    					'<ns2:AttributeCategory2></ns2:AttributeCategory2>' +
	                    					'<ns2:AttributeCategory3></ns2:AttributeCategory3>' +
	                    					'<ns2:AverageJournalFlag></ns2:AverageJournalFlag>' +
	                    					'<ns2:BalancingSegmentValue></ns2:BalancingSegmentValue>' +
	                    					'<ns2:DescrFlexErrorMessage></ns2:DescrFlexErrorMessage>' +
	                    					'<ns2:GlSlLinkId></ns2:GlSlLinkId>' +
	                    					'<ns2:GlSlLinkTable></ns2:GlSlLinkTable>' +
					                '</ns2:GlInterface>' +
					                '<ns2:GlInterface>' +
	                    					'<ns2:LedgerId>1</ns2:LedgerId>' +
	                    					'<ns2:PeriodName>Mar-17</ns2:PeriodName>' +
	                    					'<ns2:AccountingDate>2017-03-30</ns2:AccountingDate>' +
	                    					'<ns2:UserJeSourceName>Manual</ns2:UserJeSourceName>' +
	                    					'<ns2:UserJeCategoryName>Manual</ns2:UserJeCategoryName>' +
	                    					'<ns2:GroupId></ns2:GroupId>' +
	                    					'<ns2:ChartOfAccountsId></ns2:ChartOfAccountsId>' +
	                    					'<ns2:BalanceType>A</ns2:BalanceType>' +
	                    					'<ns2:CodeCombinationId></ns2:CodeCombinationId>' +
	                    					'<ns2:Segment1>'+to.substr(0,2)+'</ns2:Segment1>' +
	                    					'<ns2:Segment2>'+to.substr(3,3)+'</ns2:Segment2>' +
	                    					'<ns2:Segment3>'+to.substr(7,4)+'</ns2:Segment3>' +
	                    					'<ns2:Segment4>'+to.substr(12,4)+'</ns2:Segment4>' +
	                    					'<ns2:Segment5>'+to.substr(17,3)+'</ns2:Segment5>' +
	                    					'<ns2:Segment6></ns2:Segment6>' +
	                    					'<ns2:Segment7></ns2:Segment7>' +
	                    					'<ns2:Segment8></ns2:Segment8>' +
	                    					'<ns2:Segment9></ns2:Segment9>' +
	                    					'<ns2:Segment10></ns2:Segment10>' +
	                    					'<ns2:Segment11></ns2:Segment11>' +
	                    					'<ns2:Segment12></ns2:Segment12>' +
	                    					'<ns2:Segment13></ns2:Segment13>' +
	                    					'<ns2:Segment14></ns2:Segment14>' +
	                    					'<ns2:Segment15></ns2:Segment15>' +
	                    					'<ns2:Segment16></ns2:Segment16>' +
	                    					'<ns2:Segment17></ns2:Segment17>' +
	                    					'<ns2:Segment18></ns2:Segment18>' +
	                    					'<ns2:Segment19></ns2:Segment19>' +
	                    					'<ns2:Segment20></ns2:Segment20>' +
	                    					'<ns2:Segment21></ns2:Segment21>' +
	                    					'<ns2:Segment22></ns2:Segment22>' +
	                    					'<ns2:Segment23></ns2:Segment23>' +
	                    					'<ns2:Segment24></ns2:Segment24>' +
	                    					'<ns2:Segment25></ns2:Segment25>' +
	                    					'<ns2:Segment26></ns2:Segment26>' +
	                    					'<ns2:Segment27></ns2:Segment27>' +
	                    					'<ns2:Segment28></ns2:Segment28>' +
	                    					'<ns2:Segment29></ns2:Segment29>' +
	                    					'<ns2:Segment30></ns2:Segment30>' +
	                    					'<ns2:CurrencyCode>USD</ns2:CurrencyCode>' +
	                    					'<ns2:EnteredDrAmount currencyCode="USD">'+amount.toString()+'</ns2:EnteredDrAmount>' +
	                    					'<ns2:AccountedCr></ns2:AccountedCr>' +
	                    					'<ns2:AccountedDr></ns2:AccountedDr>' +
	                    					'<ns2:StatisticalValue></ns2:StatisticalValue>' +
	                    					'<ns2:UserCurrencyConversionType></ns2:UserCurrencyConversionType>' +
	                    					'<ns2:CurrencyConversionDate></ns2:CurrencyConversionDate>' +
	                    					'<ns2:CurrencyConversionRate></ns2:CurrencyConversionRate>' +
	                    					'<ns2:CurrencyConversionType></ns2:CurrencyConversionType>' +
	                    					'<ns2:Reference1></ns2:Reference1>' +
	                    					'<ns2:Reference2></ns2:Reference2>' +
	                    					'<ns2:Reference3></ns2:Reference3>' +
	                    					'<ns2:Reference6></ns2:Reference6>' +
	                    					'<ns2:Reference7></ns2:Reference7>' +
	                    					'<ns2:Reference8></ns2:Reference8>' +
	                    					'<ns2:Reference9></ns2:Reference9>' +
	                    					'<ns2:Reference10></ns2:Reference10>' +
	                    					'<ns2:Reference11></ns2:Reference11>' +
	                    					'<ns2:Reference12></ns2:Reference12>' +
	                    					'<ns2:Reference13></ns2:Reference13>' +
	                    					'<ns2:Reference14></ns2:Reference14>' +
	                    					'<ns2:Reference15></ns2:Reference15>' +
	                    					'<ns2:Reference16></ns2:Reference16>' +
	                    					'<ns2:Reference17></ns2:Reference17>' +
	                    					'<ns2:Reference18></ns2:Reference18>' +
	                    					'<ns2:Reference19></ns2:Reference19>' +
	                    					'<ns2:Reference20></ns2:Reference20>' +
	                    					'<ns2:Reference21></ns2:Reference21>' +
	                    					'<ns2:Reference22></ns2:Reference22>' +
	                    					'<ns2:Reference23></ns2:Reference23>' +
	                    					'<ns2:Reference24></ns2:Reference24>' +
	                    					'<ns2:Reference25></ns2:Reference25>' +
	                    					'<ns2:Reference26></ns2:Reference26>' +
	                    					'<ns2:Reference27></ns2:Reference27>' +
	                    					'<ns2:Reference28></ns2:Reference28>' +
	                    					'<ns2:Reference29></ns2:Reference29>' +
	                    					'<ns2:Reference30></ns2:Reference30>' +
	                    					'<ns2:ReferenceDate></ns2:ReferenceDate>' +
	                    					'<ns2:Attribute1></ns2:Attribute1>' +
	                    					'<ns2:Attribute2></ns2:Attribute2>' +
	                    					'<ns2:Attribute3></ns2:Attribute3>' +
	                    					'<ns2:Attribute4></ns2:Attribute4>' +
	                    					'<ns2:Attribute5></ns2:Attribute5>' +
	                    					'<ns2:Attribute6></ns2:Attribute6>' +
	                    					'<ns2:Attribute7></ns2:Attribute7>' +
	                    					'<ns2:Attribute8></ns2:Attribute8>' +
	                    					'<ns2:Attribute9></ns2:Attribute9>' +
	                    					'<ns2:Attribute10></ns2:Attribute10>' +
	                    					'<ns2:Attribute11></ns2:Attribute11>' +
	                    					'<ns2:Attribute12></ns2:Attribute12>' +
	                    					'<ns2:Attribute13></ns2:Attribute13>' +
	                    					'<ns2:Attribute14></ns2:Attribute14>' +
	                    					'<ns2:Attribute15></ns2:Attribute15>' +
	                    					'<ns2:Attribute16></ns2:Attribute16>' +
	                    					'<ns2:Attribute17></ns2:Attribute17>' +
	                    					'<ns2:Attribute18></ns2:Attribute18>' +
	                    					'<ns2:Attribute19></ns2:Attribute19>' +
	                    					'<ns2:Attribute20></ns2:Attribute20>' +
	                    					'<ns2:AttributeCategory></ns2:AttributeCategory>' +
	                    					'<ns2:AttributeCategory2></ns2:AttributeCategory2>' +
	                    					'<ns2:AttributeCategory3></ns2:AttributeCategory3>' +
	                    					'<ns2:AverageJournalFlag></ns2:AverageJournalFlag>' +
	                    					'<ns2:BalancingSegmentValue></ns2:BalancingSegmentValue>' +
	                    					'<ns2:DescrFlexErrorMessage></ns2:DescrFlexErrorMessage>' +
	                    					'<ns2:GlSlLinkId></ns2:GlSlLinkId>' +
	                    					'<ns2:GlSlLinkTable></ns2:GlSlLinkTable>' +
					                '</ns2:GlInterface>' +
					            '</ns1:interfaceRows>' +
					        '</ns1:importJournalsAsync>' +
					    '</soap:Body>' +
					'</soap:Envelope>'; 

			function createCORSRequest(method, url) { 
				var xhr = new XMLHttpRequest(); 
				xhr.open(method, url, false); 
				xhr.setRequestHeader("Authorization", "Basic " + btoa("finuser1:Welcome1"));
				return xhr; 
			} 
			var xhr = createCORSRequest("POST", "https://fuscdrmsmc34-fa-ext.us.oracle.com/fscmService/JournalImportService?WSDL"); 
			if(!xhr){ 
				console.log("XHR issue"); 
				return; 
			} 
			xhr.onload = function (){ 
				var results = xhr.responseText; 
				console.log(results); 
			} 
			xhr.setRequestHeader('Content-Type', 'text/xml'); 
			xhr.send(str);
		}

		
};