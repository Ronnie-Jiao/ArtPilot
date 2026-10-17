(function () {
    var KEY = "__LINGHUI_RELINK_TEST__";
    if ($.global[KEY]) throw new Error("A relink verification is already open.");
    var worker = /* LINGHUI_RELINK_WORKER */ null;
    var root = String($.global["__LINGHUI_RELINK_TEST_ROOT__"]);
    var originalDocument = app.documents.length ? app.activeDocument : null;
    var doc = null;
    var originals = [];
    var control = null;
    var result = "";

    function assert(value, message) {
        if (!value) throw new Error(message);
    }

    function near(a, b, message) {
        assert(Math.abs(Number(a) - Number(b)) < 0.02, message + ": " + a + " / " + b);
    }

    function matrixValues(item) {
        var m = item.matrix;
        return [m.mValueA, m.mValueB, m.mValueC, m.mValueD, m.mValueTX, m.mValueTY];
    }

    function state(item) {
        var b = item.geometricBounds;
        return {
            item: item,
            uuid: item.uuid,
            name: item.name,
            file: item.file.fsName,
            parent: item.parent,
            height: item.height,
            center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
            matrix: matrixValues(item)
        };
    }

    function locate(uuid) {
        for (var i = 0; i < doc.placedItems.length; i++) {
            if (doc.placedItems[i].uuid === uuid) return doc.placedItems[i];
        }
        throw new Error("The original placed object was removed: " + uuid);
    }

    function assertOriginal(original) {
        var item = locate(original.uuid);
        assert(item.file.fsName === original.file, "Original link was not restored");
        var values = matrixValues(item);
        for (var i = 0; i < values.length; i++) near(values[i], original.matrix[i], "Original matrix " + i);
        near(item.height, original.height, "Original height");
    }

    function assertRelinked(original, filename) {
        var item = null;
        for (var i = 0; i < doc.placedItems.length; i++) {
            if (doc.placedItems[i].name === original.name && doc.placedItems[i].parent === original.parent) {
                item = doc.placedItems[i];
                break;
            }
        }
        assert(item, "Replacement was not committed inside the original group");
        assert(item.file.fsName === new File(root + "/" + filename).fsName, "New link was not applied");
        assert(item.parent === original.parent, "Image left its original clipping group");
        assert(item.parent.clipped, "Clipping was lost");
        near(item.height, original.height, "Relinked height");
        var b = item.geometricBounds;
        near((b[0] + b[2]) / 2, original.center[0], "Relinked center X");
        near((b[1] + b[3]) / 2, original.center[1], "Relinked center Y");
        var m = matrixValues(item);
        var x = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
        var y = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
        near(x, y, "New image must scale uniformly");
        var old = original.matrix;
        var oldX = Math.sqrt(old[0] * old[0] + old[1] * old[1]);
        var oldY = Math.sqrt(old[2] * old[2] + old[3] * old[3]);
        near(m[0] / x, old[0] / oldX, "Rotation/mirror A");
        near(m[1] / x, old[1] / oldX, "Rotation/mirror B");
        near(m[2] / y, old[2] / oldY, "Rotation/mirror C");
        near(m[3] / y, old[3] / oldY, "Rotation/mirror D");
    }

    function selectSnapshot() {
        assert(doc && app.activeDocument === doc, "Verification document is not active");
        var key = "__LINGHUI_RELINK_VERIFY_SELECTION__";
        $.global[key] = { document: doc, items: [locate(originals[1].uuid), locate(originals[0].uuid)] };
        doc.selection = null;
        return key;
    }

    function addPicture(x, angle, mirror) {
        var group = doc.groupItems.add();
        var mask = group.pathItems.rectangle(720, x - 40, 140, 120);
        mask.clipping = true;
        var item = doc.placedItems.add();
        item.file = new File(root + "/old.bmp");
        item.move(group, ElementPlacement.PLACEATEND);
        item.name = "Linghui relink target " + x;
        group.clipped = true;
        item.resize(mirror ? -160 : 130, 75, true, true, true, true, 100, Transformation.CENTER);
        item.rotate(angle, true, true, true, true, Transformation.CENTER);
        var b = item.geometricBounds;
        item.translate(x - (b[0] + b[2]) / 2, 650 - (b[1] + b[3]) / 2);
        return item;
    }

    $.global[KEY] = {
        setup: function () {
            doc = app.documents.add(DocumentColorSpace.RGB, 800, 800);
            var a = addPicture(140, 17, false);
            var b = addPicture(450, -28, true);
            control = doc.placedItems.add();
            control.file = new File(root + "/old.bmp");
            control.position = [100, 300];
            originals = [state(a), state(b)];
            originals.sort(function (first, second) {
                if (first.center[1] !== second.center[1]) return second.center[1] - first.center[1];
                return first.center[0] - second.center[0];
            });
            control = state(control);
            app.redraw();
            return "OK|setup|" + app.version;
        },
        replace: function () {
            result = worker([root + "/new-01.bmp", root + "/new-02.bmp"], selectSnapshot());
            assert(result.indexOf("BATCH|2|2|2|0|0|0|0|") === 0, result);
            return "OK|replace|" + result;
        },
        nativeRelink: function () {
            locate(originals[0].uuid).relink(new File(root + "/new-01.bmp"));
            return "OK|native-relink";
        },
        describe: function () {
            var item = locate(originals[0].uuid);
            return "OK|state|" + item.file.fsName + "|" + matrixValues(item).join(",") +
                "|expected|" + originals[0].matrix.join(",");
        },
        check: function () {
            assertRelinked(originals[0], "new-01.bmp");
            assertRelinked(originals[1], "new-02.bmp");
            assertOriginal(control);
            assert(doc.placedItems.length === 3, "Unexpected image count");
            return "OK|checked|new links, groups, height, center, rotation, mirror, ratio";
        },
        undo: function () {
            assert(app.activeDocument === doc, "Refusing to undo another document");
            app.undo();
            app.redraw();
            return "OK|undo";
        },
        checkUndo: function () {
            assertOriginal(originals[0]);
            assertOriginal(originals[1]);
            assertOriginal(control);
            assert(doc.placedItems.length === 3, "Undo left temporary images");
            return "OK|undo-checked|old links and full matrices restored with one Illustrator undo";
        },
        shortage: function () {
            result = worker([root + "/new-01.bmp"], selectSnapshot());
            assert(result.indexOf("BATCH|2|1|1|0|1|0|0|") === 0, result);
            return "OK|shortage|" + result;
        },
        checkShortage: function () {
            assertRelinked(originals[0], "new-01.bmp");
            assertOriginal(originals[1]);
            assertOriginal(control);
            return "OK|shortage-checked|unpaired and unselected images unchanged";
        },
        staleSelection: function () {
            var r = worker([root + "/new-01.bmp"], "__LINGHUI_NONEXISTENT_SELECTION__");
            assert(r.indexOf("ERR|") === 0, "A stale selection was accepted");
            assertOriginal(originals[0]);
            assertOriginal(originals[1]);
            return "OK|stale-selection-checked";
        },
        cleanup: function () {
            if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
            if (originalDocument) originalDocument.activate();
            delete $.global["__LINGHUI_RELINK_VERIFY_SELECTION__"];
            delete $.global["__LINGHUI_RELINK_TEST_ROOT__"];
            delete $.global[KEY];
            return "OK|cleanup";
        }
    };
    return "OK|loaded";
}());
