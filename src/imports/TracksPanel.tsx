import svgPaths from "./svg-17z92jepgj";
import imgBackImage from "figma:asset/833310598788eff180a7773a06615414b6eed7df.png";
import imgObject from "figma:asset/f534abd7e154dd2e0612b80426d2975885178c70.png";

function StatusChips() {
  return (
    <div className="bg-[rgba(18,184,134,0.15)] content-stretch flex items-center justify-center opacity-0 px-[12px] py-[2px] relative rounded-[4px] shrink-0" data-name="Status Chips">
      <div className="css-g0mm18 flex flex-col font-['Inter:Regular','Arimo:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#12b886] text-[12px]">
        <p className="css-ew64yg leading-[15px]" dir="auto">
          חדש
        </p>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[12px] items-center leading-[18px] not-italic relative shrink-0 text-[14px] text-right">
      <p className="css-ew64yg font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#868e96]" dir="auto">
        10:07:31
      </p>
      <p className="css-ew64yg font-['Inter:Semi_Bold','Arimo:Bold',sans-serif] font-semibold relative shrink-0 text-white" dir="auto">
        זיהוי לא ידוע
      </p>
    </div>
  );
}

function DetectionNameAndStatus() {
  return (
    <div className="content-stretch flex h-[19px] items-center justify-between relative shrink-0 w-full" data-name="Detection Name and status">
      <StatusChips />
      <Frame />
    </div>
  );
}

function BackImage() {
  return (
    <div className="absolute h-[89px] left-[calc(50%-0.09px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%] w-[172px]" data-name="Back image">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[459.07%] left-[-130.23%] max-w-none top-[-8.67%] w-[354.07%]" src={imgBackImage} />
        </div>
        <div className="absolute bg-[rgba(0,0,0,0.7)] inset-0" />
      </div>
    </div>
  );
}

function ImageGroup() {
  return (
    <div className="absolute contents left-[-0.09px] top-[-1px]" data-name="Image Group">
      <BackImage />
      <div className="absolute h-[50.438px] left-[3.87px] top-[22.6px] w-[162.638px]" data-name="Object">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[95.42%] left-[0.43%] max-w-none top-[1.45%] w-[99.3%]" src={imgObject} />
        </div>
      </div>
    </div>
  );
}

function VideoAndIcon() {
  return (
    <div className="h-[88px] relative rounded-[4px] shrink-0 w-full" data-name="Video and icon">
      <div className="flex flex-row items-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-end justify-between p-[12px] relative size-full">
          <ImageGroup />
        </div>
      </div>
    </div>
  );
}

function DetectionsBrowser() {
  return (
    <div className="content-stretch flex flex-col h-[88px] items-center relative shrink-0 w-[172px]" data-name="Detections browser">
      <VideoAndIcon />
    </div>
  );
}

function IconVoice() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="IconVoice3">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_5434)" id="IconVoice3">
          <path d={svgPaths.p33037ea0} id="Vector" stroke="var(--stroke-0, #74C0FC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_1_5434">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ButtonStartScan() {
  return (
    <div className="bg-[rgba(34,139,230,0.15)] h-[30px] relative rounded-[4px] shrink-0 w-full" data-name="Button_StartScan">
      <div aria-hidden="true" className="absolute border-[#74c0fc] border-[0.4px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular','Arimo:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#74c0fc] text-[14px]" dir="auto">
            שיבוש
          </p>
          <IconVoice />
        </div>
      </div>
    </div>
  );
}

function IconExclamationTriangle() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="IconExclamationTriangle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="IconExclamationTriangle">
          <path d={svgPaths.p2ae17900} id="Vector" stroke="var(--stroke-0, #74C0FC)" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function ButtonStartScan1() {
  return (
    <div className="bg-[rgba(34,139,230,0.15)] h-[30px] relative rounded-[4px] shrink-0 w-full" data-name="Button_StartScan">
      <div aria-hidden="true" className="absolute border-[#74c0fc] border-[0.4px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular','Arimo:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[#74c0fc] text-[14px]" dir="auto">
            שיבוש הכל
          </p>
          <IconExclamationTriangle />
        </div>
      </div>
    </div>
  );
}

function LookAtFlyTo() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Look at, Fly to">
      <ButtonStartScan />
      <ButtonStartScan1 />
    </div>
  );
}

function ButtonStartScan2() {
  return (
    <div className="flex-[1_0_0] h-[30px] min-h-px min-w-px relative rounded-[4px]" data-name="Button_StartScan">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] relative size-full">
          <p className="css-ew64yg font-['Inter:Regular','Arimo:Regular',sans-serif] font-normal leading-[18px] not-italic relative shrink-0 text-[14px] text-white" dir="auto">
            סגור
          </p>
        </div>
      </div>
    </div>
  );
}

function LookAtFlyTo1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Look at, Fly to">
      <ButtonStartScan2 />
    </div>
  );
}

function ActionHeaderButtons() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-name="Action Header + Buttons">
      <LookAtFlyTo1 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <LookAtFlyTo />
      <ActionHeaderButtons />
    </div>
  );
}

function ActionHeaderButtons1() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-name="Action Header + Buttons">
      <Frame1 />
    </div>
  );
}

export default function TracksPanel() {
  return (
    <div className="bg-[#242424] content-stretch flex flex-col gap-[12px] items-end justify-center p-[12px] relative rounded-[8px] size-full" data-name="Tracks panel">
      <DetectionNameAndStatus />
      <DetectionsBrowser />
      <ActionHeaderButtons1 />
    </div>
  );
}