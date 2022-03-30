
const fs = require("fs")
const express = require("express")
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use('/assets', express.static('assets'))
app.get('/', async (req, res) => {
    fs.readFile("client.html", function(er, data){
        res.end(data)
    })
})
app.get('/filelist', async (req, res) => {
    try {
        const files = await fs.promises.readdir("assets");
        res.status(200).json(files);
    } catch (err) {
        res.status(500).json(err);
    }

});

players=[]



counter=0
time=new Date()
thyme=time.getTime()
async function mainLoop(){
    
let positions=[[0,0,0,0]]
    for(i=0; i<players.length; i++){
        players[i].coords[2]-=0.02*players[i].left
        players[i].coords[2]+=0.02*players[i].right
        players[i].coords[0]+=5*players[i].forward*Math.sin(players[i].coords[2])
        players[i].coords[1]-=5*players[i].forward*Math.cos(players[i].coords[2])
        players[i].coords[0]-=5*players[i].backward*Math.sin(players[i].coords[2])
        players[i].coords[1]+=5*players[i].backward*Math.cos(players[i].coords[2])
        console.log(players[i].mouserot-players[i].coords[3])
        if(Math.abs(players[i].mouserot-players[i].coords[3])<0.1){
            players[i].coords[3]=players[i].mouserot
        }else{
            if(Math.abs(players[i].mouserot-players[i].coords[3])>Math.PI){
                players[i].coords[3]-=0.05*Math.sign(players[i].mouserot-players[i].coords[3])
            }else{
                players[i].coords[3]+=0.05*Math.sign(players[i].mouserot-players[i].coords[3])
            }
            
        }
        
        if(players[i].coords[3]<0){
            players[i].coords[3]+=2*Math.PI
        }else if (players[i].coords[3]>(2*Math.PI)){
            players[i].coords[3]-=2*Math.PI
        }
        
    }
    for(i=0; i<players.length; i++){
        await players[i].emit("positionUpdate", players[i].coords)
        await positions.push(players[i].coords)
    }
    await io.emit("frameUpdate", positions)
    
    
    counter+=1
    if(counter%100==0){
        time=new Date()
        console.log(counter+" "+(time.getTime()-thyme))
    }
}
setInterval(mainLoop, 12)



io.sockets.on("connection", (socket)=>{
    console.log("connected")
    socket.coords=[0,0,0,0] //x position, y position, turret rotation, chasis rotation
    socket.forward=false
    socket.backward=false
    socket.right=false
    socket.left=false
    socket.mouserot=0
    
    socket.on("pressedKey", (key)=>{
        console.log("keypress "+key)
        switch (key){
            case "KeyW":
                socket.forward=true
            break
            case "KeyS":
                socket.backward=true
            break
            case "KeyA":
                socket.left=true
            break
            case "KeyD":
                socket.right=true
            break
        }
        
    })
    socket.on("releasedKey", (key)=>{
        console.log("keyrelease "+key)
        switch (key){
            case "KeyW":
                socket.forward=false
            break
            case "KeyS":
                socket.backward=false
            break
            case "KeyA":
                socket.left=false
            break
            case "KeyD":
                socket.right=false
            break
        }
        
    })
    
    socket.on("movedMouse", (rot)=>{
        socket.mouserot=rot
        
        
        
    })
    
    
    
    players.push(socket)
    
    
    
    
    
    
    socket.on("disconnect", async ()=>{  //deleting all instances of the client existing on the server
        let disc=players.indexOf(socket)
        await players.splice(disc, 1)
		console.log("disconnected "+disc)
	})
})











http.listen(42069, ()=>{});
