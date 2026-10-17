(function () {
    "use strict";

    window.LinghuiNativePathPicker = function (chooseDirectory, initialPath) {
        var fileSystem = window.cep && window.cep.fs;
        if (!fileSystem) {
            return { status: "error", message: "系统选择窗口接口未连接，请重新打开灵绘面板。" };
        }
        var initial = String(initialPath || "").replace(/^\s+|\s+$/g, "");
        if ((initial.charAt(0) === '"' && initial.charAt(initial.length - 1) === '"') ||
                (initial.charAt(0) === "'" && initial.charAt(initial.length - 1) === "'")) {
            initial = initial.substring(1, initial.length - 1);
        }
        initial = initial.replace(/\\/g, "/");
        if (initial) {
            var initialState = fileSystem.stat(initial);
            if (!initialState || initialState.err !== 0 || !initialState.data) {
                initial = "";
            } else {
                var directory = typeof initialState.data.isDirectory === "function"
                    ? initialState.data.isDirectory()
                    : initialState.data.isDirectory;
                if (!directory) initial = initial.substring(0, initial.lastIndexOf("/") + 1);
            }
        }
        var title = chooseDirectory ? "选择文件夹" : "选择文件";
        var result;
        // The CEP filesystem API opens the OS dialog directly, without a
        // BridgeTalk application target. Adobe CEP 12 documents both methods.
        if (typeof fileSystem.showOpenDialogEx === "function") {
            result = fileSystem.showOpenDialogEx(false, !!chooseDirectory, title, initial,
                chooseDirectory ? [] : ["*"], "所有文件", chooseDirectory ? "选择文件夹" : "选择");
        } else if (typeof fileSystem.showOpenDialog === "function") {
            result = fileSystem.showOpenDialog(false, !!chooseDirectory, title, initial,
                chooseDirectory ? [] : ["*"]);
        } else {
            return { status: "error", message: "系统选择窗口不可用，请重新打开灵绘面板。" };
        }
        if (!result || result.err !== 0) {
            return { status: "error", message: "无法打开系统选择窗口（" + (result ? result.err : "无返回结果") + "）。" };
        }
        if (!Array.isArray(result.data)) {
            return { status: "error", message: "系统选择窗口未返回有效路径。" };
        }
        if (!result.data.length) return { status: "cancel", path: null };
        return { status: "ok", path: String(result.data[0]) };
    };

    window.LinghuiNativeBatchPicker = function (cs, initialPath, callback) {
        var native = window.cep;
        if (!native || !native.process || !native.fs) {
            callback({ status: "error", message: "Windows 选择窗口接口未连接，请重新打开灵绘面板。" });
            return;
        }

        var extension = cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
        var directory = cs.getSystemPath(SystemPath.USER_DATA).replace(/\\/g, "/") + "/AI_Merged_Toolbox";
        var resultPath = directory + "/batch-native-" + Date.now() + "-" + Math.random().toString(16).slice(2) + ".txt";
        var executable = extension + "/native/BatchSourcePicker-1.0.4.exe";
        var directoryState = native.fs.stat(directory);
        if (directoryState.err !== 0) {
            var created = native.fs.makedir(directory);
            if (created.err !== 0) {
                callback({ status: "error", message: "无法创建选择窗口的结果目录。" });
                return;
            }
        } else if (!directoryState.data || !(typeof directoryState.data.isDirectory === "function"
                ? directoryState.data.isDirectory() : directoryState.data.isDirectory)) {
            callback({ status: "error", message: "选择窗口的结果目录不可用。" });
            return;
        }
        var launched = native.process.createProcess(executable, resultPath, initialPath || "");
        if (launched.err !== 0 || !launched.data) {
            callback({ status: "error", message: "无法打开 Windows 选择窗口（" + launched.err + "）。" });
            return;
        }

        var pid = launched.data;
        var completed = false;
        function finish(result) {
            if (completed) return;
            completed = true;
            try { native.fs.deleteFile(resultPath); } catch (cleanupError) {}
            callback(result);
        }
        function readResult() {
            var content = native.fs.readFile(resultPath);
            if (content.err === 0) {
                var lines = String(content.data || "").replace(/^\uFEFF/, "").split(/\r?\n/);
                var status = lines.shift();
                if (status === "ok") {
                    var items = lines.filter(function (line) { return line.length > 0; });
                    finish({ status: "ok", items: items });
                } else if (status === "cancel") {
                    finish({ status: "cancel", items: null });
                } else {
                    finish({ status: "error", message: lines.join("\n") || "Windows 选择窗口没有返回有效结果。" });
                }
                return;
            }
            var running = native.process.isRunning(pid);
            if (running.err !== 0 || running.data !== true) {
                finish({ status: "error", message: "Windows 选择窗口已退出，但没有取得选择结果。" });
                return;
            }
            window.setTimeout(readResult, 250);
        }
        window.setTimeout(readResult, 250);
    };
}());
