export default class Api {
    
    static async execute(route='', method='GET', body=null){

        return new Promise((resolve, reject) => {
            fetch('api/'+route, {
                method: method,
                body: body,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': 0
                }
                
            })
            .then(response => {
                
                response.json()
                .then((json) => {
                    resolve(json)
                })
                .catch((err) => {
                    console.log(err)
                    resolve(null)
                })
            })
            .catch((err) => {
                reject(err)
            })
        })
    }
    static isJson(json)
    {
        let str = json.toString();
        
        try
        {
            JSON.parse(str);
        }
        catch (e)
        {
            return false;
        }
        
        return true;
    }

}