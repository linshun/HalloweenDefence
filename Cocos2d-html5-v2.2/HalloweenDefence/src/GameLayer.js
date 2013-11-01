var GameLayer = cc.Layer.extend({
	_maps: null,
	_winSize: null,

	_towerLayer: null,
	_hShellLayer: null,
	_monsterLayer: null,
	
	_showRange: false,

	_quad: null,

	init:function(){
		this._super();
		this._winSize = cc.Director.getInstance().getWinSize();
		
		// init game maps
		this.initMaps();
		
		// init tower
		this.initTowers();

		// add tool bar
		this.initToolsBar();

		// set update
		this.scheduleUpdate();

		this.addMonster(Monster.createOrange());
		this.schedule(this.autoAddMonster, 2);

		this._quad = new Quadtree(0, cc.rect(0, 0, this._winSize.width, this._winSize.height));
	},
	initMaps: function(){
		this._maps = GameMaps.create();
		this._maps.setPosition(cc.p(0, 30));
		this.addChild(this._maps);
	},
	initTowers: function(){
		var tower = Tower.createLow();
		tower.setGameLayer(this);
		var towerPoint = this._maps.getPositionByPoint(cc.p(4, 3));
		tower.setPosition(towerPoint);
		tower.showAttackRange(this._showRange);

		var tower2 = Tower.createHigh();
		tower2.setGameLayer(this);		
		// var tower2Point = this._maps.getPositionByPoint(cc.p(6, 2));
		var tower2Point = this._maps.getPositionByPoint(cc.p(3, 4));
		tower2.setPosition(tower2Point);
		tower2.showAttackRange(this._showRange);		

		this._towersLayer = cc.Layer.create();
		this._towersLayer.addChild(tower);
		this._towersLayer.addChild(tower2);
		this.addChild(this._towersLayer);
	},
	initToolsBar: function(){
		var toolLayer = cc.Layer.create();
		
		var sToolsBar = cc.Sprite.create(s_ToolsBar);
		sToolsBar.setPosition(cc.p(this._winSize.width / 2, sToolsBar.getContentSize().height / 2));
		toolLayer.addChild(sToolsBar);
		this.addChild(toolLayer, 2);

		// add monster menuitem
		var mGreen = cc.Sprite.create(s_Monster[0]);
		var mGreenSelected = cc.Sprite.create(s_Monster[0]);
		mGreenSelected.setColor(cc.c4b(125, 125, 125, 125));
		var menuMonsterGreen = cc.MenuItemSprite.create(
			mGreen,
			mGreenSelected,
			function(){
 				this.addMonster(Monster.createGreen());
			}, this);
		menuMonsterGreen.setPosition(cc.p(118, -245 * 0.6));

		var mPurple = cc.Sprite.create(s_Monster[1]);
		var mPurpleSelected = cc.Sprite.create(s_Monster[1]);
		mPurpleSelected.setColor(cc.c4b(125, 125, 125, 125));
		var menuMonsterPurple = cc.MenuItemSprite.create(
			mPurple,
			mPurpleSelected,
			function(){
				this.addMonster(Monster.createPurple());				
			}, this);
		menuMonsterPurple.setPosition(cc.pAdd(menuMonsterGreen.getPosition(), cc.p(48, 0)));

		var mOrange = cc.Sprite.create(s_Monster[2]);
		var mOrangeSelected = cc.Sprite.create(s_Monster[2]);
		mOrangeSelected.setColor(cc.c4b(125, 125, 125, 125));
		var menuMonsterOrange = cc.MenuItemSprite.create(
			mOrange, 
			mOrangeSelected,
			function(){
				this.addMonster(Monster.createOrange());			
			}, this);
		menuMonsterOrange.setPosition(cc.pAdd(menuMonsterPurple.getPosition(), cc.p(48, 0)));

		var mShowAttackRange = cc.MenuItemFont.create("Show Range", function(){
			this._showRange = !this._showRange;

			if (this._towersLayer){
				var towers = this._towersLayer.getChildren();
				if (towers){
					for(var i = 0, ilen = towers.length; i < ilen; i++){
						towers[i].showAttackRange(this._showRange);
					}
				}
			}

			if (this._monsterLayer){
				var monster = this._monsterLayer.getChildren();
				if (monster){
					for(var j = 0, jlen = monster.length; j < jlen; j++){
						monster[j].showAttackedRange(this._showRange);
					}
				}
			}

			if (this._hShellLayer){
				var hShells = this._hShellLayer.getChildren();
				if (hShells){
					for(var k = 0, klen = hShells.length; k < klen; k++){
						hShells[k].showAttackRange(this._showRange);
					}
				}
			}

		}, this);
		mShowAttackRange.setFontSize(14);
		mShowAttackRange.setPosition(cc.pAdd(menuMonsterGreen.getPosition(), cc.p(- 120, 5)));
		
		var menu = cc.Menu.create(
			menuMonsterGreen,
			menuMonsterPurple,
			menuMonsterOrange,
			mShowAttackRange
		);
		
		toolLayer.addChild(menu);
	},
	addHighShell: function(hShell){
		if (!this._hShellLayer){
			this._hShellLayer = cc.Layer.create();
			this._hShellLayer.setPosition(cc.p(0, 0));
			this.addChild(this._hShellLayer);
		}
		hShell.showAttackRange(this._showRange);
		this._hShellLayer.addChild(hShell);
	},
	addMonster: function(monster){
		if (!this._monsterLayer){
			this._monsterLayer = cc.Layer.create();
			this.addChild(this._monsterLayer);
		}
			
		this._monsterLayer.addChild(monster, 1);
		
		var array = this._maps.getWayPositions();
		var action1 = cc.CardinalSplineTo.create(20, array, 0);
		var remove = cc.CallFunc.create(function(){
			this.removeFromParent();
			// cc.log("remove monster");
		}, monster);
		monster.showAttackedRange(this._showRange);
		
		monster.getSprite().runAction(cc.Sequence.create(action1, remove));
	},
	checkTowerLocation: function(position){
		var point = this._maps.getPointByLocation(position);
		// check way point
		var isWayPoint = this._maps.checkPointIsWayPoint(point);
		if (isWayPoint)
			return null;
		var location = this._maps.getPositionByPoint(point);
		// check tower point
		var towers = this._towersLayer.getChildren();
		for(var i = 0, ilen = towers.length; i < ilen; i++){
			var tower = towers[i];
			if (cc.pointEqualToPoint(tower.getPosition(), location)){
				return null;
			}
		}		
		return location;
	},
	update: function(dt){
		if (!this._towersLayer ||
			!this._monsterLayer)
			return;
		
		// low shell check
		var monsters = this._monsterLayer.getChildren();
		var towers = this._towersLayer.getChildren();
		if (!monsters || !towers) return;

		this._quad.clear();
		for (var i = 0; i < monsters.length; i++){
			this._quad.insert(monsters[i]);
		}

		for(var i = 0, ilen = towers.length; i < ilen; i++){
			var tower = towers[i];
			var list = [];
			this._quad.retrieve(list, tower);
			// cc.log("length:" + list.length);
			for(var j = 0, jlen = list.length; j < jlen; j++){
				towers[i].checkAttack(list[j]);
			}
		}

		// // high shell check
		if (!this._hShellLayer)
			return;
		var hShells = this._hShellLayer.getChildren();
		if (!hShells) return;
		for(var i = 0, ilen = hShells.length; i < ilen; i++){
			var hShell = hShells[i];
			var list = [];
			this._quad.retrieve(list, hShell);
			for (var j = 0, jlen = list.length; j < jlen; j++){
				hShell.checkAttack(list[j]);
			}
		}
		// cc.log("end update:" + hShells.length);
	},
	autoAddMonster: function(){
		var value = Math.random() * 3;
		if (value > 2)
			this.addMonster(Monster.createPurple());
		else if (value > 1)
			this.addMonster(Monster.createGreen());
		else
			this.addMonster(Monster.createOrange());
	}
});

var GameScene = cc.Scene.extend({
	onEnter:function(){
		this._super();
		var layer = new GameLayer();
		layer.init();
		this.addChild(layer);
	}
});


