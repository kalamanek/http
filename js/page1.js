app.controller('Page1', ['$http', 'globals', 'ws',
    function ($http, globals,  ws) {
        var self = this;

        self.userGroups = [];
        self.chatMessages = {};
		self.currentGroup = {_id : null ,name:'' }
        self.message = {"text": ""};
		self.lastMessage = globals.lastMessage;
		self.messageAmount = 0;
		self.messageHolder = {};
		
			
        self.getUserGroups = function () {
            $http.get('/user/groups').then(
                function (rep) {
                    try {
                        self.userGroups = rep.data;
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }
        self.getUserGroups();

        self.getChat = function (group_id) {
			
			var Table = document.getElementById("table");
			$("#table tr").remove(); 
			self.userGroups.forEach((v, i) => {
				if(self.userGroups[i]._id === self.currentGroup._id){
					self.userGroups[i].color = 'black';
				}
			});
			
			$http.put('/groups', {_id: group_id}).then(
			
				function (rep) {
					try {
						self.chatMessages = rep.data;
						self.currentGroup._id = group_id;
						if(self.chatMessages !== 0){
							self.chatMessages.reverse();
						}
						self.messageAmount =0;
						self.chatMessages.forEach((v,i) =>{
							self.messageAmount++;
						});
						//TODO go to bottom when document ready
					} catch (err) {
					}
				},
				function (err) {
				}
			);
			self.getChatName(group_id);
        };
		
		self.getChatName = function (group_id){	
			for (let i in self.userGroups) {
				if(self.userGroups[i]._id == group_id){
					self.currentGroup.name = self.userGroups[i].name;
				}
			}
		}
		
		self.reqChat = function (group_id){
			$http.put('/groups', {_id: group_id , amount : self.messageAmount}).then(
			
				function (rep) {
					try {
						self.messageHolder = rep.data;
						self.messageHolder.forEach((v,i) =>{
							addMessageStart(self.messageHolder[i].name,self.messageHolder[i].text);
						});
						scrollElement.scrollTop = 100;
					} catch (err) {
					}
				},
				function (err) {
				});
		}
		

        self.sendMessage = function () {
            $http.post('/group/messages', {text: self.message.text, group_id: self.currentGroup._id}).then(
                function (rep) {
                    try {
                        self.message.text = "";
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }
			
		function addMessageEnd(a,b){
			var r = document.createElement("TR");
			var ca = document.createElement('td');
			var cb = document.createElement('td');
			var ta = document.createTextNode(a);
			var tb = document.createTextNode(b);
			ca.appendChild(ta);
			cb.appendChild(tb);	
			 var t  = document.getElementById('tbl');


			ca.appendChild(ta);
			cb.appendChild(tb);
		
			r.appendChild(ca);
			r.appendChild(cb);
			self.messageAmount++ ;
			$("#table").append(r);
			self.gotoBottom();
		};

		function addMessageStart(a,b){
			var r = document.createElement("TR");
			var ca = document.createElement('td');
			var cb = document.createElement('td');
			var ta = document.createTextNode(a);
			var tb = document.createTextNode(b);
			ca.appendChild(ta);
			cb.appendChild(tb);	
			 var t  = document.getElementById('tbl');


			ca.appendChild(ta);
			cb.appendChild(tb);
		
			r.appendChild(ca);
			r.appendChild(cb);
			self.messageAmount++ ;
			$("#table").prepend(r);
			self.gotoBottom();
		};

		var scrollElement = document.getElementById("scrollElement");
		var lastScrollTop = 0;
		
		scrollElement.addEventListener("scroll", (e) =>{
			var st = scrollElement.scrollTop;
			if(scrollElement.scrollTop == 0  &&  st < lastScrollTop){
				self.reqChat(self.currentGroup._id);
			}
			lastScrollTop = st <= 0 ? 0 : st;
		});
		
		
		
		self.gotoBottom = function(){
				scrollElement.scrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
		}		
	
		
		
		self.pushMsg = function(){ // TODO should reply that message seen and change color on server
			if(self.currentGroup._id === self.lastMessage.group_id){
				addMessageEnd(self.lastMessage.from,self.lastMessage.message);
				self.gotoBottom();
			}else{
				self.userGroups.forEach((v, i) => {
					if(self.userGroups[i]._id === self.lastMessage.group_id){
						self.userGroups[i].color = 'blue';
					}
				});
			}
			globals.lastMessage.seen = true;
		};
		
    }
]);
