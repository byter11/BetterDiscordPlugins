/**
 * @name SoundBoard
 * @author mohsin
 * @description Adds a soundboard button when connected to a voice channel
 * @version 0.0.1
 */
const { React, ReactDOM } = BdApi;
const Module = {
  Events: BdApi.findModuleByProps("dispatch", "subscribe", "unsubscribe"),
  SelectedChannel: BdApi.findModuleByProps("getChannelId", "getVoiceChannelId"),
  Devices: {
    setInputDevice: BdApi.findModuleByProps("setInputDevice").setInputDevice,
    getInputDevices: BdApi.findModuleByProps("getInputDevices").getInputDevices,
    getOutputDevices: BdApi.findModuleByProps("getOutputDevices").getOutputDevices,
  },
  PanelButton: BdApi.findModule(
    (m) => m.default && m.default.displayName === "PanelButton"
  ),
};

const Devices = {
  Input: Object.values(BdApi.findModuleByProps('getInputDevices').getInputDevices()).map((m) => ({id: m.id, name: m.name})),
  Output: Object.values(BdApi.findModuleByProps('getOutputDevices').getOutputDevices()).map((m) => ({id: m.id, name: m.name})),
  Active: BdApi.loadData('SoundBoard', "Devices") || {Input: ({id: 'default' , name: 'Default'}), Output: ({id: 'default', name: 'Default'})}
};

const Style = {
  Header: BdApi.findModuleByProps("defaultColor", "h1", "h5"),
  Size: BdApi.findModuleByProps("size10", "size12"),
  Button: BdApi.findModuleByProps("button"),
  CloseButton: BdApi.findModuleByProps('button', 'filled'),
  ButtonProperties: BdApi.findModuleByProps("button", "enabled", "disabled"),
  Input: BdApi.findModuleByProps("input", "inputDefault"),
  Flex: BdApi.findModuleByProps("flex", "horizontal"),
  FlexPanel: BdApi.findModuleByProps("flex", "flexChild"),
  Popout: BdApi.findModuleByProps("popouts", "popoutLeft"),
  Layer: BdApi.findModuleByProps("LayerClassName"),
  Animator: BdApi.findModuleByProps("animatorTop", "translate"),
};

module.exports = class SoundBoard {
  _cancelPatch = null;
  popout = null;
  clips = BdApi.loadData(this.getName(), 'Clips') || [];
  getName() {
    return "SoundBoard";
  }
  load() {}

  start() {
    this.popout = this.createPopout();
    this._cancelPatch = BdApi.monkeyPatch(Module.PanelButton, "default", {
      after: ({ returnValue }) => {
        if (
          returnValue.props.tooltipClassName &&
          returnValue.props.tooltipClassName.includes("noise")
        ) {
          const { button, lookBlank, colorBrand, grow } = Style.Button;
          const { justifyStart, alignStretch, noWrap } = Style.Flex;

          return React.createElement(
            "div",
            {
              className: `${Style.FlexPanel.flex} ${Style.FlexPanel.horizontal} ${justifyStart} ${alignStretch} ${noWrap}`,
            },
            [
              React.createElement(
                "button",
                {
                  className: `${Style.ButtonProperties.button} ${Style.ButtonProperties.enabled} ${button} ${lookBlank} ${colorBrand} ${grow}`,
                  onClick: (e) => {
                    this.handleClick(e);
                  },
                },
                "s"
              ),
              returnValue,
            ]
          );
        }
      },
    });
  }

  handleClick = (e) => {
    const popouts = document.querySelector("." + Style.Popout.popouts);
    const offset = e.target.getBoundingClientRect();

    // const maxWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    // const maxHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    if (!this.popout.classList.contains("popout-open")) {
      popouts.append(this.popout);
      this.popout.classList.add("popout-open");
      const { offsetWidth, offsetHeight } = this.popout.firstElementChild;
      this.popout.style.top = Math.round(offset.top - offsetHeight - 20) + "px";
      this.popout.style.left =
        Math.round(offset.left - offsetWidth / 2 + 20) + "px";
      const listener = (e) => {
        if (!e.target.closest('.popout-open')) {
          popouts.removeChild(this.popout);
          this.popout.classList.remove("popout-open");
          document.removeEventListener("click", listener);
        }
      };
      document.addEventListener("click", listener);
    }
  };

  stop() {
    this._cancelPatch();
  }

  play = (audio) => {
    Module.Devices.setInputDevice(Devices.Active.Input.id);
    this.playAudio(audio).then(()=> Module.Devices.setInputDevice("default"));
  };

  playAudio(audio) {
    return Promise.race([
      new Promise((res) => {
      setTimeout(function(){
				audio.play();
				audio.onended = res
			}, 500);
    }),
    new Promise((res) => {
      setTimeout(function(){
        res();
      }, 5000);
    })
  ]);
  }

  createPopout = () => {
    const { flex, horizontal, flexChild } = Style.FlexPanel;
    const { justifyCenter, alignStart, alignStretch, wrap } = Style.Flex;
    const { animatorTop, translate, didRender } = Style.Animator;
    const { LayerClassName } = Style.Layer;
    const {button, colorBrand, colorGrey, hasHover, hoverBrand, grow, lookFilled, sizeMedium} = Style.Button
    

    var el = document.createElement("template");
    el.innerHTML = `
		<div class="${animatorTop} ${translate} ${didRender} ${LayerClassName}">
			<div id="soundboard-popout" style="pointer-events: all;width: 250px;border-radius: 4px;-webkit-box-shadow: var(--elevation-high);box-shadow: var(--elevation-high);background: var(--background-primary);">
        <div style="background-color: #2f3136;color: #fff;padding: 13px;font-weight: 500;display: flex;justify-content: center;-webkit-box-align: center;-ms-flex-align: center;align-items: center;position: relative;border-radius: 3px 3px 0 0;">
          SoundBoard
        </div>
        <div id="soundboard-items" class=" ${flex} ${horizontal} ${justifyCenter}  ${alignStretch} ${wrap} ">
          ${this.clips.map((c) => 
            `<button class="${colorGrey} ${hasHover} ${hoverBrand} ${grow} ${lookFilled} ${sizeMedium}" style="color: white; flex: 0 1 47%; align-self: auto; min-height: 100px;margin: 1% 1%">${c.name}
              <audio preload="auto" src="${c.link}"></audio>
            </button>`
          ).join()}
        </div>
      </div>
		</div>
		`;
    el.innerHTML.trim();
    el.content.firstElementChild.querySelectorAll('button').forEach((e)=>{
      e.addEventListener('click', (e)=>this.play(e.target.querySelector('audio')));
    })
    return el.content.firstElementChild;
  };

  getSettingsPanel() {
    const { flex, horizontal, flexChild } = Style.FlexPanel;
    const { justifyStart, alignStretch, noWrap } = Style.Flex;
    const { h1,h3, h5, defaultColor, defaultMarginh1,defaultMarginh3, defaultMarginh5, title } = Style.Header;
    const { size14 } = Style.Size;
    const {colorBrand, grow, lookFilled, sizeMedium} = Style.Button
    const inputOptions = Devices.Input.map(
      (d) => `<option id="${d.id}" style="background-color: #2f3136;" value="${d.name}" ${Devices.Active.Input.name === d.name ? "selected" : ''}>${d.name}</option>`
    ).join();
    
    const outputOptions = Devices.Output.map(
      (d) => `<option id="${d.id}" style="background-color: #2f3136;" value="${d.name}" ${Devices.Active.Output.name === d.name ? "selected" : ''}>${d.name}</option>`
    ).join();

    var el = document.createElement('template')
    el.innerHTML = /*html*/`
    <div id="soundboard-settings">
      <h1 class="${h1} ${defaultColor} ${defaultMarginh1} ${title}"> Settings </h1>
      <h3 class="${h3} ${defaultColor} ${defaultMarginh3} ${title}"> Stereo Mix Devices </h3>
      <div class="${flex} ${horizontal} ${justifyStart} ${alignStretch} ${noWrap}" >
        <div class="${flexChild}" style="flex: 1 1 50%">
          <h5 class="${h5} ${defaultColor} ${defaultMarginh5} ${title}">Input</h5>
          <select id="soundboard-input-select" name="input" class="${Style.Input.inputDefault}">
            ${inputOptions}
          </select>
        </div>
        <div class="${flexChild}" style="flex: 1 1 50%">
          <h5 class="${h5} ${defaultColor} ${defaultMarginh5} ${title}">Output</h5>
          <select id="soundboard-output-select" name="output" class="${Style.Input.inputDefault}">
            ${outputOptions}
          </select>
        </div>
      </div>
      <div class="divider-3573oO marginBottom40-2vIwTv"></div>
      <h3 class="${h3} ${defaultColor} ${defaultMarginh3} ${title}"> Audio Clips </h3>
      <div id="soundboard-clips-input" class="${flex} ${horizontal} ${justifyStart} ${alignStretch} ${noWrap}" style="margin-bottom: 30px">
        <div class="${flexChild}" style="flex: 1 1 33%">
          <h5 class="${h5} ${defaultColor} ${defaultMarginh5} ${title}">Name</h5>
          <input class="${Style.Input.inputDefault}" name="name" placeholder="name">
        </div>
        <div class="${flexChild}" style="flex: 1 1 33%">
          <h5 class="${h5} ${defaultColor} ${defaultMarginh5} ${title}">Link (from Discord only)</h5>
          <input class="${Style.Input.inputDefault}" name="link" placeholder="link">
        </div>
        <button class="${colorBrand} ${grow} ${lookFilled} ${sizeMedium}" style="align-self: flex-end">Add</button>
      </div>
    </div>
		`.trim();

    el = el.content.firstElementChild;


    const selects = el.getElementsByTagName('select')
    const inputs = el.querySelectorAll('#soundboard-clips-input > div > input');

    this.clips.forEach((c) => {
      el.appendChild(this.createClipElement(c));
    });

    for(let e of selects) {
      if(e.name === 'input')
        e.addEventListener('change', ()=>Devices.Active.Input = {id: e.options[e.selectedIndex].id, name:e.value});
      else
        e.addEventListener('change', ()=>Devices.Active.Output = {id: e.options[e.selectedIndex].id, name: e.value});
    }
    el.querySelector('#soundboard-clips-input > button').addEventListener('click', (e) => {
      const clipData = {name: inputs[0].value, link: inputs[1].value};
      el.appendChild(this.createClipElement(clipData));
      this.clips.push(clipData);
      inputs.forEach((i)=>i.value = '');
    });

    BdApi.onRemoved(el, () => {
      BdApi.saveData(this.getName(), 'Devices', Devices.Active);
      BdApi.saveData(this.getName(), 'Clips', this.clips);
      this.popout = this.createPopout();
    });

    return el;
  }

  createClipElement(clipData){
    const {button, filled} = Style.CloseButton;
    const { flex, horizontal, flexChild } = Style.FlexPanel;
    const { justifyStart, alignStretch, noWrap } = Style.Flex;
    const {h5, defaultColor,defaultMarginh5, title } = Style.Header;

    const clip = document.createElement('template');
    clip.innerHTML = `
      <div class="${flex} ${horizontal} ${justifyStart} ${alignStretch} ${noWrap}">
        <div class="${flexChild}" style="margin-bottom: 20px">
          <h5 class="${h5} ${defaultColor} ${defaultMarginh5} ${title}">Name</h5>
          <div class="${Style.Input.inputDefault}" style="min-width: 200px;">${clipData.name}</div>
        </div>
        <button class="${flexChild} ${button} ${filled}" style="align-self: center;"></button>
      </div>
    `;
    clip.content.firstElementChild.querySelector('button').addEventListener('click', (e)=>{
      e.target.parentElement.parentElement.removeChild(e.target.parentElement);
      this.clips.pop(clipData);
    });
    return clip.content.firstElementChild;
  }
};
