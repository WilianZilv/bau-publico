<?php
function get_client_ip_server() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
 
    return strval($ipaddress);
}

$ip = get_client_ip_server();

define('USER', $ip);

function db(){
    return new PDO('mysql:host=HOST;dbname=DBNAME', "USER", "PASS",
    array(PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8") );
}
function uniqueVisits(){

    $count = db()->query("SELECT * FROM sessions WHERE id>0")->rowCount();
    echo json_encode(['visitas' => $count]);

}

function checkActivity($time, $msg){

    $now = date("Y-m-d H:i:s");
    $user = db()->query("SELECT * FROM sessions WHERE session='" . USER . "' ORDER BY date DESC")->fetch(PDO::FETCH_ASSOC);
    $duration = 0;
    if($user != false){
        
        db()->prepare("UPDATE sessions SET date=? WHERE session=?")->execute([$now, USER]);

        $nowInt = strtotime($now);
        $last = strtotime($user['date']);

        $duration = $nowInt - $last;
        if($duration < $time){

            echo json_encode(['msg' => $msg]);
            
            return false;
        }
        return true;
        
    }else{
        
        db()->prepare("INSERT INTO sessions (session, date) VALUES (?,?)")->execute([USER, $now]);
        return true;
    }
}
function validURL($url){

    $ch = curl_init($url);
    curl_setopt( $ch, CURLOPT_NOBODY, true );
    curl_setopt( $ch, CURLOPT_HEADER, true );
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
    curl_exec($ch);

    if(curl_errno($ch))
    {   
        return false;
    }

    $info = curl_getinfo($ch);
    curl_close($ch);

    if(isset($info['download_content_length'])){
        if($info['download_content_length'] >= 1250000){
            return false;
        }else{
            return true;
        }
    }else{
        return false;
    }
    
}
function warnUser(){

    $result = db()->query("SELECT warnings FROM sessions WHERE session='".USER."' AND warnings>2")->fetch();
    if($result != false){
        db()->query("UPDATE sessions SET banned = 1 WHERE session='".USER."'");
    }else{
        db()->query("UPDATE sessions SET warnings = warnings + 1 WHERE session='".USER."'")->execute();
    }
}
function isBanned(){
    $result = db()->query("SELECT banned FROM sessions WHERE session='".USER."' AND banned=1")->fetch();
    if($result == false){
        return false;
    }
    return true;
}
function filterText($text){
	
	function startsWith($haystack, $needle)
	{
		 $length = strlen($needle);
		 return (substr($haystack, 0, $length) === $needle);
	}
	
	function endsWith($haystack, $needle)
	{
		$length = strlen($needle);
		if ($length == 0) {
			return true;
		}
	
		return (substr($haystack, -$length) === $needle);
	}
  
	$text = trim($text);
	
	$list = explode(" ", $text);
	
	$forbidden = ['sex', 'porn', 'hentai', 'xxx', 'xnxx', 'gay', 'penis', 'pussy', 'novinhas', 'xvideos', 'redtube', 'pornhub', 'youtrannytube', 'sexy', 'bunda', 'gostosa', 'buceta', 'shemale', 'male', 'anal', 'nude', 'ass', 'butt'];
	
	foreach($list as $item){
		
		if(startsWith($item, "http")){
            
            $porn = false;
            foreach($forbidden as $word){
                if (strpos($item, $word) !== false) {
                    $porn = true;
                    break;
                }
            }
            if($porn){
                warnUser();
                echo json_encode(["msg" => "Que feio..."]); 
                $text = NULL;
                break;

            }else if (!validURL($item)){
                echo json_encode(["msg" => "Algo de errado com este link."]);
                $text = NULL;
                break;
            }
			
		}
		
    }
    return $text;
}
function makePost($text){

    if(isBanned()){
        echo json_encode(["msg" => "Você não pode mais usar o Baú 😭"]);
        return;
    }
    if(!checkActivity(30, "Calma lá champs, você pode guardar algo a cada 30s")){
        
        return;
    }

    $text = filterText($text);

    if(empty($text)){
        echo json_encode(['msg' => 'Parece que seu texto está vazio']);
        return;
    }
    $now = date("Y-m-d H:i:s");
    $sql = "INSERT INTO chest (text, date) VALUES (?,?)";
    db()->prepare($sql)->execute([$text, $now]);

}
function newPosts($start){

    $prep = db()->prepare("SELECT * FROM chest WHERE id>?");
    $prep->execute([$start]);

    $result = $prep->fetchAll(PDO::FETCH_ASSOC);
    
    $count = sizeof($result);
    if($count > 0){
        echo json_encode(['count' => $count]);
    }
    
}
function loadPosts($start){

    $compare = $start > -1 ? "<" : ">";

    $prep = db()->prepare("SELECT id, text, likes, (SELECT COUNT(*) FROM likes WHERE session='".USER."' AND item_id = chest.id) AS liked FROM chest WHERE id $compare"."? ORDER BY id DESC LIMIT 60");
    $prep->execute([$start]);

    $result = $prep->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($result);
    return;
    $first = true;

    $encoded = "";

    for ($i = 0; $i < sizeof($result); $i++) {

        $encodedItem = json_encode($result[$i]);

        if(json_last_error() == 0){
            $encoded = $encoded . ($first ? '[' : ','). $encodedItem;
            $first = false;
        }
    }
    echo $encoded . "]";
    
}
function loadTop(){

    $sql = "SELECT id, text, likes, (SELECT COUNT(*) FROM likes WHERE session='".USER."' AND item_id = chest.id) AS liked FROM chest WHERE date > CURDATE() AND likes>0 ORDER BY likes DESC LIMIT 5";

    $result = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($result);
}
function like($id){

    $value = 1;

    $db = db();

    $query = $db->prepare("SELECT * FROM likes WHERE session='".USER."' AND item_id=?");
    $query->execute([$id]);

    if($query->fetch()){
        $db->prepare("DELETE FROM likes WHERE session=? AND item_id=?")->execute([USER, $id]);
        $value = -1;
    }else{

        $db->prepare("INSERT INTO likes (session, item_id) VALUES (?,?)")->execute([USER, $id]);
        
    }

    $db->prepare("UPDATE chest SET likes = likes + $value WHERE id=?")->execute([$id]);

    $query = $db->prepare("SELECT likes, ".($value == 1 ? 1 : 0)." AS liked FROM chest WHERE id=?");
    $query->execute([$id]);

    $result = $query->fetch(PDO::FETCH_ASSOC);
    echo json_encode($result);
}

if(isset($_GET["posts"])){
    $start=$_GET["posts"];
    loadPosts($start);
    return;
}

if(isset($_GET["visits"])){
    uniqueVisits();
    return;
}

if(isset($_GET["top"])){
    loadTop();
    return;
}

if(isset($_GET["text"])){
    makePost($_GET["text"]);
    return;
}

if(isset($_GET["like"])){
    like($_GET["like"]);
    return;
}

if(isset($_GET["newposts"])){
    newPosts($_GET["newposts"]);
    return;
}

if(isset($_GET["test"])){
    $val = $_GET["test"];
    

}



