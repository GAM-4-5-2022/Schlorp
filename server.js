
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
tanksize=[50,80]


const map = require("./map.json")
console.log(map)
walls=[]

for (i=0; i<(map.length/2); i++){
    for(j=0; j<map[i*2].length;j++){
        if(map[i*2][j]){
            walls.push([80+160*j, 160*i,20,140])
        }
    }
}

for (i=0; i<(map.length/2-1); i++){
    for(j=0; j<map[i*2+1].length;j++){
        if(map[i*2+1][j]){
            walls.push([160*j, 80+160*i,140,20])
        }
    }
}

console.log(walls)






function checkPoint(point, rect){
    
    let sides = [[0,0,0],[0,0,0]]
    let s = [0,0]
    let dist=0
    let mindist=1000
    let minside=[0,0]
    let triangles=[[[0,1],[2,3]],[[0,3],[2,1]]]
    for (let i = 0; i<triangles.length; i++){
        sides[0][0]=distance(rect[triangles[i][0][0]][0], rect[triangles[i][0][0]][1], rect[triangles[i][0][1]][0], rect[triangles[i][0][1]][1])
        sides[0][1]=distance(rect[triangles[i][0][0]][0], rect[triangles[i][0][0]][1], point[0], point[1])
        sides[0][2]=distance(rect[triangles[i][0][1]][0], rect[triangles[i][0][1]][1], point[0], point[1])
        s[0]=(sides[0][0]+sides[0][1]+sides[0][2])/2
        sides[1][0]=distance(rect[triangles[i][1][0]][0], rect[triangles[i][1][0]][1], rect[triangles[i][1][1]][0], rect[triangles[i][1][1]][1])
        sides[1][1]=distance(rect[triangles[i][1][0]][0], rect[triangles[i][1][0]][1], point[0], point[1])
        sides[1][2]=distance(rect[triangles[i][1][1]][0], rect[triangles[i][1][1]][1], point[0], point[1])
        s[1]=(sides[1][0]+sides[1][1]+sides[1][2])/2
        dist=distance(rect[triangles[i][0][0]][0], rect[triangles[i][0][0]][1], rect[triangles[i][1][1]][0], rect[triangles[i][1][1]][1])
        if((dist < (2 / sides[0][0] * Math.sqrt(s[0] * (s[0]-sides[0][0]) * (s[0]-sides[0][1]) * (s[0]-sides[0][2])))) || (dist < (2 / sides[1][0] * Math.sqrt(s[1] * (s[1]-sides[1][0]) * (s[1]-sides[1][1]) * (s[1]-sides[1][2]))))){
            return(false)
        }
        
    }
    
    return(true)
        

}

function distance(x1,y1,x2,y2){
    return(Math.sqrt(((x2-x1)**2)+((y2-y1)**2)))
}


function getPoints(x,y,w,h,rot){
    let r = Math.sqrt((w/2)**2+(h/2)**2)
    let alpha = Math.acos(h/(2*r))
    let x1 = r*Math.cos(rot+alpha)
    let y1 = r*Math.sin(rot+alpha)
    let x2 = r*Math.cos(rot-alpha)
    let y2 = r*Math.sin(rot-alpha)
    return([[x-x1, y+y1],[x+x2, y-y2],[x+x1, y-y1],[x-x2, y+y2]])
}



async function mainLoop(){
    
    let positions=[[0,0,0,0]]
    let debugpos = getPoints(positions[0][0],positions[0][1],tanksize[0],tanksize[1],positions[0][2])
    try{
        for(let i=0; i<players.length; i++){
            players[i].coords[2]+=0.02*players[i].left
            players[i].coords[2]-=0.02*players[i].right
            players[i].coords[0]+=5*players[i].forward*Math.cos(players[i].coords[2])
            players[i].coords[1]-=5*players[i].forward*Math.sin(players[i].coords[2])
            players[i].coords[0]-=5*players[i].backward*Math.cos(players[i].coords[2])
            players[i].coords[1]+=5*players[i].backward*Math.sin(players[i].coords[2])
            
            let points=getPoints(players[i].coords[0], players[i].coords[1], tanksize[0], tanksize[1], players[i].coords[2])
            debugpos=debugpos.concat(points)
            
            let collision = false
            for(let j=0; j<4; j++){
                for(let k=0; k<positions.length; k++){
                    if(checkPoint(points[j], getPoints(positions[k][0],positions[k][1],tanksize[0],tanksize[1],positions[k][2]))){
                        
                        collision=true
                        break
                    }
                    if(checkPoint(getPoints(positions[k][0],positions[k][1],tanksize[0],tanksize[1],positions[k][2])[j], points )){
                        
                        collision=true
                        break
                    }
                }
                for(let k=0; k<walls.length; k++){
                    debugpos=debugpos.concat(getPoints(walls[k][0],walls[k][1],walls[k][2],walls[k][3],0))
                    if(checkPoint(points[j], getPoints(walls[k][0],walls[k][1],walls[k][2],walls[k][3],0))){
                        
                        
                        
                        collision=true
                        break
                    }
                    if(checkPoint(getPoints(walls[k][0],walls[k][1],walls[k][2],walls[k][3],0)[j], points )){
                        
                        
                        
                        collision=true
                        break
                    }
                    
                    
                    
                    
                }
                
                if(collision){
                    players[i].coords[0]-=5*players[i].forward*Math.cos(players[i].coords[2])
                    players[i].coords[1]+=5*players[i].forward*Math.sin(players[i].coords[2])
                    players[i].coords[0]+=5*players[i].backward*Math.cos(players[i].coords[2])
                    players[i].coords[1]-=5*players[i].backward*Math.sin(players[i].coords[2])
                    players[i].coords[2]-=0.02*players[i].left
                    players[i].coords[2]+=0.02*players[i].right
                    break
                }
            }
            
            
            
            
            if(Math.abs(players[i].mouserot-players[i].coords[3])<0.1){
                players[i].coords[3]=players[i].mouserot
            }else{
                if(Math.abs(players[i].mouserot-players[i].coords[3])>Math.PI){
                    players[i].coords[3]-=0.06*Math.sign(players[i].mouserot-players[i].coords[3])
                }else{
                    players[i].coords[3]+=0.06*Math.sign(players[i].mouserot-players[i].coords[3])
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
        //await io.emit("debugUpdate", debugpos)
    }catch{
        console.log("Skipped frame")
    }
    

}
setInterval(mainLoop, 20)



io.sockets.on("connection", (socket)=>{
    console.log("connected")
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    socket.coords=[80,80,0,0] //x position, y position, turret rotation, chasis rotation
    socket.forward=false
    socket.backward=false
    socket.right=false
    socket.left=false
    socket.mouserot=0
    socket.emit("wallUpdate", walls)
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
