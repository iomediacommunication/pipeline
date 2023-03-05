const tDistribution = (t, df) => {
    const z = Math.sqrt(df) * t / Math.sqrt(df + t * t);
    const alpha = 0.5;
    const beta = 0.5 * df;
    const incBeta = (x, a, b) => {
        let bt = 0;
        const maxIterations = 100;
        let i = 0;
        while (i <= maxIterations) {
            const num = Math.pow(x, a) * Math.pow(1 - x, b);
            const den = betaFunc(a, b);
            const term = num / den;
            bt += term;
            if (term < 1e-8 * bt) break;
            a++;
            i++;
        }
        return bt / betaFunc(a - 1, b);
    };
    const betaFunc = (a, b) => Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
    let bt = 0;
    let tPrev = 0;
    let i = 0;
    while (i <= 100) {
        const term = incBeta(alpha, beta, z / (z * z + i * i));
        bt += term;
        if (term < 1e-8 * bt) break;
        if (i > 0 && Math.abs((term - tPrev) / term) < 1e-8) break;
        tPrev = term;
        i++;
    }
    return bt;
}

const logGamma = (x) => {
    if (x <= 0) {
        return NaN;
    }

    if (x < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }

    let res = 0;
    while (x < 10) {
        res -= Math.log(x);
        x++;
    }

    const q = 1 / (x * x);
    const c = [-1.0 / 12.0, 1.0 / 360.0, -1.0 / 1260.0, 1.0 / 1680.0, -1.0 / 1188.0];
    let num = c[4];
    for (let i = 3; i >= 0; i--) {
        num = q * num + c[i];
    }
    return res + (x - 0.5) * Math.log(x) - x + Math.log(2 * Math.PI / x) / 2 + num;
}

const getArgs = () => {
    const args = {};
    process.argv
        .slice(2, process.argv.length)
        .forEach( arg => {
            // long arg
            if (arg.slice(0,2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2,longArg[0].length);
                args[longArgFlag] = longArg.length > 1 ? longArg[1] : true;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1,arg.length).split('');
                flags.forEach(flag => {
                    args[flag] = true;
                });
            }
        });
    return args;
}

const args = getArgs() || {};

if (!args.hasOwnProperty('runs')) {
    args.runs = '[]';
}

const values = JSON.parse(args.runs);
const timestamps = [
    1672527600,
    1672527630,
    1672527660,
    1672527690,
    1672527720,
    1672527750,
    1672527780,
    1672527810,
    1672527840,
    1672527870,
    1672527900,
    1672527930,
]

const usage = timestamps.map((t, index) => {
    return {
        t: t,
        m: values[index] || 0
    }
});

const n = usage.length;

const t = usage.map((use) => use.t);
const m = usage.map((use) => use.m);

const sumT = usage.reduce((sum, profiler) => {
    return sum + profiler.t;
}, 0)

const sumM = usage.reduce((sum, profiler) => {
    return sum + profiler.m;
}, 0)

const sumTM = usage.reduce((sum, profiler) => {
    return sum + (profiler.t * profiler.m);
}, 0)

const sumTT = usage.reduce((sum, profiler) => {
    return sum + (profiler.t * profiler.t);
}, 0)

const dF = n - 2;
const slope = (n * sumTM - sumT * sumM) / (n * sumTT - sumT * sumT);
const residuals = m.map((mi, i) => mi - slope * t[i]);
const sumResiduals = residuals.reduce((a, b) => a + b * b, 0);
const stdError = Math.sqrt(sumResiduals / dF);

// Check for statistical significance
const significance = slope / (stdError / Math.sqrt(sumTT - sumT * sumM / n));
const p = 2 * (1 - tDistribution(Math.abs(significance), dF));

console.log(`slope : ${slope.toFixed(2)}`);
console.log(`standard error of the estimate : ${stdError.toFixed(2)}`);
console.log(`t-value : ${significance.toFixed(2)}`);
console.log(`p-value : ${p.toFixed(4)}`);
console.log(`significant at p < 0.05 ? ${p < 0.05}`);

if (p < 0.05) {
    console.error('slope is significant at the 0.05 level');
    process.exit(1);
}
