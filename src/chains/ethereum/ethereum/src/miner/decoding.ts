import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { bufferToBigInt } from "@ganache/utils";
import { BN } from "ethereumjs-util";

const WORD_SIZE = 32; // bytes

/**
 * For dynamic-length types, like `bytes` and `string`, returns the starting
 * position of the value in `memory`, and the `length` of the value.
 *
 * Calling this function when the type is not dynamic will not work. You have
 * been warned.
 *
 * @param memory
 * @param offset
 * @returns
 */
function getDynamicMarkers(memory: Buffer, offset: number) {
  // Since a Buffer's length can't come anywhere close to
  // `Number.MAX_SAFE_INTEGER` in Node it is safe to decode the start
  // and length values as UInt32s.
  offset += WORD_SIZE;
  const start = memory.readUInt32BE(offset - 4) + WORD_SIZE + 4;
  offset += WORD_SIZE;
  const length = memory.readUInt32BE(offset - 4);
  return { start, length };
}

/**
 * Returns the hex representation of the bytes in `memory`.
 *
 * @param length
 * @param memory
 * @param offset
 * @returns
 */
function handleBytes(length: number, memory: Buffer, offset: number) {
  return `0x${memory.subarray(offset, offset + length).toString("hex")}`;
}

const int = (memory: Buffer, offset: number) => {
  // convert from two's compliment to signed BigInt
  // The binary inversion operator, `~`, flips the bits, so now we
  // just need to add 1 to finish converting from two's compliment.
  return 1n + ~bufferToBigInt(memory.subarray(offset, offset + WORD_SIZE));
};

const uint = (memory: Buffer, offset: number) =>
  bufferToBigInt(memory.subarray(offset, offset + WORD_SIZE));

const string = (memory: Buffer, offset: number) => {
  const { start, length } = getDynamicMarkers(memory, offset);
  return memory.toString("utf8", start, start + length);
};

const bool = (memory: Buffer, offset: number) => memory[offset + 31] !== 0;

const address = (memory: Buffer, offset: number) =>
  memory.subarray(offset + 12, offset + WORD_SIZE);

const bytes = (memory: Buffer, offset: number) => {
  const { start, length } = getDynamicMarkers(memory, offset);
  return handleBytes(length, memory, start);
};

const fixedBytes = Array.from({ length: 32 }, (_: any, length: number) =>
  // partially apply handleBytes with `length`
  handleBytes.bind(null, length)
);

export const signatureMap = new Map([
  [1368866505, []],
  [1309416733, [int]],
  [4122065833, [uint]],
  [1093685164, [string]],
  [843419373, [bool]],
  [741264322, [address]],
  [199720790, [bytes]],
  [1847107880, [fixedBytes[1]]],
  [3921027734, [fixedBytes[2]]],
  [763578662, [fixedBytes[3]]],
  [3764340945, [fixedBytes[4]]],
  [2793701517, [fixedBytes[5]]],
  [2927928721, [fixedBytes[6]]],
  [1322614312, [fixedBytes[7]]],
  [1334060334, [fixedBytes[8]]],
  [2428341456, [fixedBytes[9]]],
  [20780939, [fixedBytes[10]]],
  [67127854, [fixedBytes[11]]],
  [2258660029, [fixedBytes[12]]],
  [2488442420, [fixedBytes[13]]],
  [2456219775, [fixedBytes[14]]],
  [3667227872, [fixedBytes[15]]],
  [1717330180, [fixedBytes[16]]],
  [866084666, [fixedBytes[17]]],
  [3302112666, [fixedBytes[18]]],
  [1584093747, [fixedBytes[19]]],
  [1367925737, [fixedBytes[20]]],
  [3923391840, [fixedBytes[21]]],
  [3589990556, [fixedBytes[22]]],
  [2879508237, [fixedBytes[23]]],
  [4055063348, [fixedBytes[24]]],
  [193248344, [fixedBytes[25]]],
  [4172368369, [fixedBytes[26]]],
  [976705501, [fixedBytes[27]]],
  [3358255854, [fixedBytes[28]]],
  [1265222613, [fixedBytes[29]]],
  [3994207469, [fixedBytes[30]]],
  [3263516050, [fixedBytes[31]]],
  [666357637, [fixedBytes[32]]],
  [1812949376, [uint, uint]],
  [262402885, [uint, string]],
  [510514412, [uint, bool]],
  [1491830284, [uint, address]],
  [2534451664, [string, uint]],
  [1264337527, [string, string]],
  [3283441205, [string, bool]],
  [832238387, [string, address]],
  [910912146, [bool, uint]],
  [2414527781, [bool, string]],
  [705760899, [bool, bool]],
  [2235320393, [bool, address]],
  [574869411, [address, uint]],
  [1973388987, [address, string]],
  [1974863315, [address, bool]],
  [3673216170, [address, address]],
  [3884059252, [uint, uint, uint]],
  [2104037094, [uint, uint, string]],
  [1733758967, [uint, uint, bool]],
  [3191032091, [uint, uint, address]],
  [1533929535, [uint, string, uint]],
  [1062716053, [uint, string, string]],
  [1185403086, [uint, string, bool]],
  [529592906, [uint, string, address]],
  [1515034914, [uint, bool, uint]],
  [2332955902, [uint, bool, string]],
  [3587091680, [uint, bool, bool]],
  [1112473535, [uint, bool, address]],
  [2286109610, [uint, address, uint]],
  [3464692859, [uint, address, string]],
  [2060456590, [uint, address, bool]],
  [2104993307, [uint, address, address]],
  [2526862595, [string, uint, uint]],
  [2750793529, [string, uint, string]],
  [4043501061, [string, uint, bool]],
  [3817119609, [string, uint, address]],
  [4083337817, [string, string, uint]],
  [753761519, [string, string, string]],
  [2967534005, [string, string, bool]],
  [2515337621, [string, string, address]],
  [689682896, [string, bool, uint]],
  [3801674877, [string, bool, string]],
  [2232122070, [string, bool, bool]],
  [2469116728, [string, bool, address]],
  [130552343, [string, address, uint]],
  [3773410639, [string, address, string]],
  [3374145236, [string, address, bool]],
  [4243355104, [string, address, address]],
  [995886048, [bool, uint, uint]],
  [3359211184, [bool, uint, string]],
  [464374251, [bool, uint, bool]],
  [3302110471, [bool, uint, address]],
  [3224906412, [bool, string, uint]],
  [2960557183, [bool, string, string]],
  [3686056519, [bool, string, bool]],
  [2509355347, [bool, string, address]],
  [2954061243, [bool, bool, uint]],
  [626391622, [bool, bool, string]],
  [1349555864, [bool, bool, bool]],
  [276362893, [bool, bool, address]],
  [3950005167, [bool, address, uint]],
  [3734671984, [bool, address, string]],
  [415876934, [bool, address, bool]],
  [3530962535, [bool, address, address]],
  [2273710942, [address, uint, uint]],
  [3136907337, [address, uint, string]],
  [3846889796, [address, uint, bool]],
  [2548867988, [address, uint, address]],
  [484110986, [address, string, uint]],
  [4218888805, [address, string, string]],
  [3473018801, [address, string, bool]],
  [4035396840, [address, string, address]],
  [742821141, [address, bool, uint]],
  [555898316, [address, bool, string]],
  [3951234194, [address, bool, bool]],
  [4044790253, [address, bool, address]],
  [1815506290, [address, address, uint]],
  [7426238, [address, address, string]],
  [4070990470, [address, address, bool]],
  [25986242, [address, address, address]],
  [1554033982, [uint, uint, uint, uint]],
  [2024634892, [uint, uint, uint, string]],
  [1683143115, [uint, uint, uint, bool]],
  [3766828905, [uint, uint, uint, address]],
  [949229117, [uint, uint, string, uint]],
  [2080582194, [uint, uint, string, string]],
  [2989403910, [uint, uint, string, bool]],
  [1127384482, [uint, uint, string, address]],
  [1818524812, [uint, uint, bool, uint]],
  [4024028142, [uint, uint, bool, string]],
  [2495495089, [uint, uint, bool, bool]],
  [3776410703, [uint, uint, bool, address]],
  [1628154048, [uint, uint, address, uint]],
  [3600994782, [uint, uint, address, string]],
  [2833785006, [uint, uint, address, bool]],
  [3398671136, [uint, uint, address, address]],
  [3221501959, [uint, string, uint, uint]],
  [2730232985, [uint, string, uint, string]],
  [2270850606, [uint, string, uint, bool]],
  [2877020669, [uint, string, uint, address]],
  [1995203422, [uint, string, string, uint]],
  [1474103825, [uint, string, string, string]],
  [310782872, [uint, string, string, bool]],
  [3432549024, [uint, string, string, address]],
  [2763295359, [uint, string, bool, uint]],
  [2370346144, [uint, string, bool, string]],
  [1371286465, [uint, string, bool, bool]],
  [2037328032, [uint, string, bool, address]],
  [2565338099, [uint, string, address, uint]],
  [4170733439, [uint, string, address, string]],
  [4181720887, [uint, string, address, bool]],
  [2141537675, [uint, string, address, address]],
  [1451396516, [uint, bool, uint, uint]],
  [3906845782, [uint, bool, uint, string]],
  [3534472445, [uint, bool, uint, bool]],
  [1329595790, [uint, bool, uint, address]],
  [2438978344, [uint, bool, string, uint]],
  [2754870525, [uint, bool, string, string]],
  [879671495, [uint, bool, string, bool]],
  [1231956916, [uint, bool, string, address]],
  [3173363033, [uint, bool, bool, uint]],
  [831186331, [uint, bool, bool, string]],
  [1315722005, [uint, bool, bool, bool]],
  [1392910941, [uint, bool, bool, address]],
  [1102442299, [uint, bool, address, uint]],
  [2721084958, [uint, bool, address, string]],
  [2449150530, [uint, bool, address, bool]],
  [2263728396, [uint, bool, address, address]],
  [3399106228, [uint, address, uint, uint]],
  [1054063912, [uint, address, uint, string]],
  [435581801, [uint, address, uint, bool]],
  [4256361684, [uint, address, uint, address]],
  [2697204968, [uint, address, string, uint]],
  [2373420580, [uint, address, string, string]],
  [581204390, [uint, address, string, bool]],
  [3420819197, [uint, address, string, address]],
  [2064181483, [uint, address, bool, uint]],
  [1676730946, [uint, address, bool, string]],
  [2116501773, [uint, address, bool, bool]],
  [3056677012, [uint, address, bool, address]],
  [2587672470, [uint, address, address, uint]],
  [2034490470, [uint, address, address, string]],
  [22350596, [uint, address, address, bool]],
  [1430734329, [uint, address, address, address]],
  [149837414, [string, uint, uint, uint]],
  [2773406909, [string, uint, uint, string]],
  [4147936829, [string, uint, uint, bool]],
  [3201771711, [string, uint, uint, address]],
  [2697245221, [string, uint, string, uint]],
  [1821956834, [string, uint, string, string]],
  [3919545039, [string, uint, string, bool]],
  [3144824297, [string, uint, string, address]],
  [1427009269, [string, uint, bool, uint]],
  [1993105508, [string, uint, bool, string]],
  [3816813520, [string, uint, bool, bool]],
  [3847527825, [string, uint, bool, address]],
  [1481210622, [string, uint, address, uint]],
  [844415720, [string, uint, address, string]],
  [285649143, [string, uint, address, bool]],
  [3939013249, [string, uint, address, address]],
  [3587119056, [string, string, uint, uint]],
  [2366909661, [string, string, uint, string]],
  [3864418506, [string, string, uint, bool]],
  [1565476480, [string, string, uint, address]],
  [2681211381, [string, string, string, uint]],
  [3731419658, [string, string, string, string]],
  [739726573, [string, string, string, bool]],
  [1834430276, [string, string, string, address]],
  [2256636538, [string, string, bool, uint]],
  [1585754346, [string, string, bool, string]],
  [1081628777, [string, string, bool, bool]],
  [3279013851, [string, string, bool, address]],
  [1250010474, [string, string, address, uint]],
  [3944480640, [string, string, address, string]],
  [1556958775, [string, string, address, bool]],
  [1134328815, [string, string, address, address]],
  [1572859960, [string, bool, uint, uint]],
  [1119461927, [string, bool, uint, string]],
  [1019590099, [string, bool, uint, bool]],
  [1909687565, [string, bool, uint, address]],
  [885731469, [string, bool, string, uint]],
  [2821114603, [string, bool, string, string]],
  [1066037277, [string, bool, string, bool]],
  [3764542249, [string, bool, string, address]],
  [2155164136, [string, bool, bool, uint]],
  [2636305885, [string, bool, bool, string]],
  [2304440517, [string, bool, bool, bool]],
  [1905304873, [string, bool, bool, address]],
  [685723286, [string, bool, address, uint]],
  [764294052, [string, bool, address, string]],
  [2508990662, [string, bool, address, bool]],
  [870964509, [string, bool, address, address]],
  [3668153533, [string, address, uint, uint]],
  [1280700980, [string, address, uint, string]],
  [1522647356, [string, address, uint, bool]],
  [2741431424, [string, address, uint, address]],
  [2405583849, [string, address, string, uint]],
  [609847026, [string, address, string, string]],
  [1595265676, [string, address, string, bool]],
  [2864486961, [string, address, string, address]],
  [3318856587, [string, address, bool, uint]],
  [72663161, [string, address, bool, string]],
  [2038975531, [string, address, bool, bool]],
  [573965245, [string, address, bool, address]],
  [1857524797, [string, address, address, uint]],
  [2148146279, [string, address, address, string]],
  [3047013728, [string, address, address, bool]],
  [3985582326, [string, address, address, address]],
  [853517604, [bool, uint, uint, uint]],
  [3657852616, [bool, uint, uint, string]],
  [2753397214, [bool, uint, uint, bool]],
  [4049711649, [bool, uint, uint, address]],
  [1098907931, [bool, uint, string, uint]],
  [3542771016, [bool, uint, string, string]],
  [2446522387, [bool, uint, string, bool]],
  [2781285673, [bool, uint, string, address]],
  [3554563475, [bool, uint, bool, uint]],
  [3067439572, [bool, uint, bool, string]],
  [2650928961, [bool, uint, bool, bool]],
  [1114097656, [bool, uint, bool, address]],
  [3399820138, [bool, uint, address, uint]],
  [403247937, [bool, uint, address, string]],
  [1705899016, [bool, uint, address, bool]],
  [2318373034, [bool, uint, address, address]],
  [2387273838, [bool, string, uint, uint]],
  [2007084013, [bool, string, uint, string]],
  [549177775, [bool, string, uint, bool]],
  [1529002296, [bool, string, uint, address]],
  [1574643090, [bool, string, string, uint]],
  [392356650, [bool, string, string, string]],
  [508266469, [bool, string, string, bool]],
  [2547225816, [bool, string, string, address]],
  [2372902053, [bool, string, bool, uint]],
  [1211958294, [bool, string, bool, string]],
  [3697185627, [bool, string, bool, bool]],
  [1401816747, [bool, string, bool, address]],
  [453743963, [bool, string, address, uint]],
  [316065672, [bool, string, address, string]],
  [1842623690, [bool, string, address, bool]],
  [724244700, [bool, string, address, address]],
  [1181212302, [bool, bool, uint, uint]],
  [1348569399, [bool, bool, uint, string]],
  [2874982852, [bool, bool, uint, bool]],
  [201299213, [bool, bool, uint, address]],
  [395003525, [bool, bool, string, uint]],
  [1830717265, [bool, bool, string, string]],
  [3092715066, [bool, bool, string, bool]],
  [4188875657, [bool, bool, string, address]],
  [3259532109, [bool, bool, bool, uint]],
  [719587540, [bool, bool, bool, string]],
  [992632032, [bool, bool, bool, bool]],
  [2352126746, [bool, bool, bool, address]],
  [1620281063, [bool, bool, address, uint]],
  [2695133539, [bool, bool, address, string]],
  [3231908568, [bool, bool, address, bool]],
  [4102557348, [bool, bool, address, address]],
  [2617143996, [bool, address, uint, uint]],
  [2691192883, [bool, address, uint, string]],
  [4002252402, [bool, address, uint, bool]],
  [1760647349, [bool, address, uint, address]],
  [194640930, [bool, address, string, uint]],
  [2805734838, [bool, address, string, string]],
  [3804222987, [bool, address, string, bool]],
  [1870422078, [bool, address, string, address]],
  [1287000017, [bool, address, bool, uint]],
  [1248250676, [bool, address, bool, string]],
  [1788626827, [bool, address, bool, bool]],
  [474063670, [bool, address, bool, address]],
  [1384430956, [bool, address, address, uint]],
  [3625099623, [bool, address, address, string]],
  [1180699616, [bool, address, address, bool]],
  [487903233, [bool, address, address, address]],
  [1024368100, [address, uint, uint, uint]],
  [2301889963, [address, uint, uint, string]],
  [3964381346, [address, uint, uint, bool]],
  [519451700, [address, uint, uint, address]],
  [4111650715, [address, uint, string, uint]],
  [2119616147, [address, uint, string, string]],
  [2751614737, [address, uint, string, bool]],
  [3698927108, [address, uint, string, address]],
  [1770996626, [address, uint, bool, uint]],
  [2391690869, [address, uint, bool, string]],
  [4272018778, [address, uint, bool, bool]],
  [602229106, [address, uint, bool, address]],
  [2782496616, [address, uint, address, uint]],
  [1567749022, [address, uint, address, string]],
  [4051804649, [address, uint, address, bool]],
  [3961816175, [address, uint, address, address]],
  [2764647008, [address, string, uint, uint]],
  [1561552329, [address, string, uint, string]],
  [2116357467, [address, string, uint, bool]],
  [3755464715, [address, string, uint, address]],
  [2706362425, [address, string, string, uint]],
  [1560462603, [address, string, string, string]],
  [900007711, [address, string, string, bool]],
  [2689478535, [address, string, string, address]],
  [3877655068, [address, string, bool, uint]],
  [3154862590, [address, string, bool, string]],
  [1595759775, [address, string, bool, bool]],
  [542667202, [address, string, bool, address]],
  [2350461865, [address, string, address, uint]],
  [4158874181, [address, string, address, string]],
  [233909110, [address, string, address, bool]],
  [221706784, [address, string, address, address]],
  [3255869470, [address, bool, uint, uint]],
  [2606272204, [address, bool, uint, string]],
  [2244855215, [address, bool, uint, bool]],
  [227337758, [address, bool, uint, address]],
  [2652011374, [address, bool, string, uint]],
  [1197235251, [address, bool, string, string]],
  [1353532957, [address, bool, string, bool]],
  [436029782, [address, bool, string, address]],
  [3484780374, [address, bool, bool, uint]],
  [3754205928, [address, bool, bool, string]],
  [3401856121, [address, bool, bool, bool]],
  [3476636805, [address, bool, bool, address]],
  [3698398930, [address, bool, address, uint]],
  [769095910, [address, bool, address, string]],
  [2801077007, [address, bool, address, bool]],
  [1711502813, [address, bool, address, address]],
  [1425929188, [address, address, uint, uint]],
  [2647731885, [address, address, uint, string]],
  [3270936812, [address, address, uint, bool]],
  [3603321462, [address, address, uint, address]],
  [69767936, [address, address, string, uint]],
  [566079269, [address, address, string, string]],
  [1863997774, [address, address, string, bool]],
  [2406706454, [address, address, string, address]],
  [2513854225, [address, address, bool, uint]],
  [2858762440, [address, address, bool, string]],
  [752096074, [address, address, bool, bool]],
  [2669396846, [address, address, bool, address]],
  [3982404743, [address, address, address, uint]],
  [4161329696, [address, address, address, string]],
  [238520724, [address, address, address, bool]],
  [1717301556, [address, address, address, address]]
]);

const CONSOLE_PRECOMPILE = new BN(
  Buffer.from([
    0x63, 0x6f, 0x6e, 0x73, 0x6f, 0x6c, 0x65, 0x2e, 0x6c, 0x6f, 0x67
  ])
);

export const getLogs = (event: InterpreterStep) => {
  // STATICCALL, which is the OPCODE that is used to initiate a console.log, has
  // 6 params, but we only care about the following 3.
  const [inLength, inOffset, toAddress] = event.stack.slice(-4, -1);

  // if the toAddress is our precompile address we should try parsing
  if (!toAddress.eq(CONSOLE_PRECOMPILE)) return;

  // TODO: can users pass in values that would cause invalid memory reads?
  // should we check bounds?
  const memoryStart = inOffset.toNumber();
  const memoryEnd = memoryStart + inLength.toNumber();
  const memory: Buffer = event.memory.subarray(memoryStart, memoryEnd);
  const method = memory.readUInt32BE(0); // our method
  const handlers = signatureMap.get(method);
  if (!handlers) return null;

  const start = 4;
  const values = handlers.map((handler, index) => {
    const offset = start + index * WORD_SIZE;
    return handler(memory, offset);
  });

  return values;
};

export type ConsoleLogs = ReturnType<typeof getLogs>;
