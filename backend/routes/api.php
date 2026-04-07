<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ShoeModelController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\MachineController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ModelRequirementController;
use App\Http\Controllers\CellRunController;
use App\Http\Controllers\MachineLocationController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('shoe-models', ShoeModelController::class);
Route::apiResource('sections', SectionController::class);
Route::apiResource('machines', MachineController::class);
Route::get('locations/holding-inventory', [LocationController::class, 'holdingInventory']);
Route::get('/locations/{location}/machine-history', [MachineLocationController::class, 'historyByLocation']);
Route::apiResource('locations', LocationController::class);
Route::apiResource('model-requirements', ModelRequirementController::class);
Route::post('import-model-requirements', [ModelRequirementController::class, 'importExcel']);
Route::post('cell-runs/assign', [CellRunController::class, 'assignCell']);
Route::post('cell-runs/stop', [CellRunController::class, 'stopCell']);
Route::get('cell-runs/history/{locationId}', [CellRunController::class, 'getHistory']);
Route::apiResource('cell-runs', CellRunController::class);
Route::get('cell-monitor/{locationId}', [CellRunController::class, 'getMonitorData']);
Route::post('cell-runs/{id}/update-actual', [CellRunController::class, 'updateActual']);

Route::apiResource('machine-locations', MachineLocationController::class);
Route::post('machine-locations/scan', [MachineLocationController::class, 'scan']);
Route::get('machines/lookup/{qrCode}', [MachineController::class, 'lookupByQr']);

// Import Routes
Route::post('/import-machines/sheets', [MachineController::class, 'getExcelSheets']);
Route::post('import-machines', [MachineController::class, 'importExcel']);
Route::post('/import-models', [ShoeModelController::class, 'importExcel']);

Route::post('machines/auto-generate', [MachineController::class, 'autoGenerate']);
