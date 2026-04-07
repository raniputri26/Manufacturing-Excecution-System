<?php

namespace App\Http\Controllers;

use App\Models\ShoeModel;
use Illuminate\Http\Request;

class ShoeModelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(ShoeModel::with('requirements')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:shoe_models',
            'name' => 'required|string',
            'target_capacity' => 'nullable|integer'
        ]);

        $shoeModel = ShoeModel::create($validated);
        return response()->json($shoeModel, 201);
    }

    public function show(ShoeModel $shoeModel)
    {
        return response()->json($shoeModel->load('requirements'));
    }

    public function update(Request $request, ShoeModel $shoeModel)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|unique:shoe_models,code,' . $shoeModel->id,
            'name' => 'sometimes|string',
            'target_capacity' => 'nullable|integer'
        ]);

        $shoeModel->update($validated);
        return response()->json($shoeModel);
    }

    public function destroy(ShoeModel $shoeModel)
    {
        $shoeModel->delete();
        return response()->json(null, 204);
    }
}

