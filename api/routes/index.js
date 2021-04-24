var express = require('express');
var router = express.Router();
var got = require('got')
var axios = require('axios')
var _ = require('lodash')

// I have working calls in insomnia, just need to pull in all the data, find a way to iterate through "all" guilds - or at least a lot of them 
// Maybe there is a way to get a list of guilds and their ids that have killed at least 1 mythic boss
// Once I have a some kind of list of guilds to look for I can make calls with a start date of the first day of the tier 
// use the total flag to determine the last page and start looking from there
// count the number of attempts that occur before a kill for a particular boss for "all" guilds 
// once I find a kill for every boss or reach the end stop counting and move to the next guild
// store the data for these guilds somewhere (firebase?) - do some research here for the best / easiest place to store these
// pop up a UI and let the people go to town!
// ?? 
// profit

const difficultyToNum = {
  'mythic': 5,
  'heroic': 4,
  'normal': 3,
}

const numToDifficulty = _.invert(difficultyToNum)

router.get('/test', function(req, res, next) {
     res.json([{
       id: 1,
       name: "Hiccup",
       password: 'hiccup'
     }, {
       id: 2,
       name: "King Arthur",
       password: 'king-arthur'
     }])
   })

   router.get('/wcl-token', async (req, res, next) => {
        console.log('starting')
        const authorization = `Basic ${Buffer.from(`${process.env.WCL_CLIENT_ID}:${process.env.WCL_CLIENT_SECRET}`).toString('base64')}`
        const url = 'https://www.warcraftlogs.com/oauth/token'
        try{
          const options = {
            method: 'POST',
            headers: { 
              'content-type': 'application/x-www-form-urlencoded',
              authorization,
            },
            data: 'grant_type=client_credentials',
            url,
          }
          const response = await axios(options)
        
          const token = response.data.access_token
          res.cookie('wcl_token', token, {expire: 3600000 + Date.now()}).send(`cookie set: ${token}`)
        }catch(e){
            console.error(e)
            res.send(`Got error: ${e}`)
        }
   })

   router.get('/cookies', (req, res) => {
    console.log('Cookies: ', req.headers.cookie)
    res.send('done')
   })

   router.get('/test-wcl', async (req, res) => {
     const wclToken = req.headers.cookie
     const token = wclToken.split('=')[1]
     const url = 'https://www.warcraftlogs.com/api/v2/client'
     const authorization = `Bearer ${token}`
     const options = { 
       method: 'GET',
       headers:{
         'content-type': 'application/json',
         authorization
        },
       url
     }

     const response = await axios(options)
     console.log(response)
     const {data} = response
     res.send(data)
   })

   router.get('/thought-pulls', async (req, res) => {
    const wclToken = req.headers.cookie
    const token = wclToken.split('=')[1]
    const url = 'https://www.warcraftlogs.com/api/v2/client/'
    const authorization = `Bearer ${token}`
    const options = {
      method: 'post',
      headers: {authorization},
      data: {query: `
      query{
        reportData{
          reports(
            guildName:"Thought", 
            guildServerSlug:"sargeras", 
            guildServerRegion:"US"
            page: 1,      
            startTime: 1607411048000

          ){
            has_more_pages,
            total,
            data{
              startTime,
              fights{
                difficulty,
                kill,
                startTime,
                name
              }
            }
          }
        }
      }`
      },
      url
    }
    try{
      const response = await axios(options)
      const {data} = response
      const fightsWithTimes = _.flatMap(data.data.reportData.reports.data, (report => {
        return report.fights.map(fight => ({...fight, time: report.startTime + fight.startTime}))
      }))
      const raidFights = fightsWithTimes.filter(fight => fight.difficulty)
      const fightsByBoss = _.groupBy(raidFights, (fight) => `${fight.name}-${fight.difficulty}`)
      const firstKillPerBoss = _.entries(fightsByBoss).reduce((acc, cur) => {
        const [bossKey, fights] = cur
        const killsForCur = fights.filter(fight => fight.kill)
        const firstKill = _.minBy(killsForCur, kill => kill.time)
        acc.push({bossKey, ...firstKill})
        return acc
      }, [])
      const mythicKills = firstKillPerBoss.filter(kill => kill.difficulty === 5)

      const pullsPerKill = mythicKills.map(kill => {
        const wipes = fightsByBoss[kill.bossKey].filter(fight => fight.time < kill.time)
        return {...kill, numWipes: wipes.length}
      })
      res.send(pullsPerKill)
    } catch (e) { 
      console.log(e)
      res.send(e)
    }
    
   })
   
module.exports = router;